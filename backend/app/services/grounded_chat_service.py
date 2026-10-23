import re
import os
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.review import Review
from app.models.document import Document, TextBlock
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse, CitationReference

STOP_WORDS = {
    "what", "is", "the", "are", "for", "in", "a", "an", "of", "to", "does", "have",
    "it", "on", "at", "by", "from", "with", "any", "how", "can", "show", "tell", "me",
    "there", "which", "when", "where", "who", "whom", "this", "that", "these", "those",
    "and", "or", "but", "so", "as", "if", "than", "because", "while", "do", "did", "done",
    "be", "been", "being", "has", "had", "will", "would", "shall", "should", "may", "might", "must",
    "about", "into", "over", "after", "before", "between", "under", "above", "out", "up", "down"
}

SYNONYM_MAP: Dict[str, List[str]] = {
    "expiration": ["expir", "use by", "shelf life", "expiry", "date"],
    "expiry": ["expir", "use by", "shelf life", "date"],
    "expire": ["expir", "use by", "shelf life", "date"],
    "shelf": ["shelf life", "expir", "use by"],
    "storage": ["store", "°c", "temperature", "freeze", "humidity", "celsius"],
    "temperature": ["store", "°c", "celsius", "freeze", "temp"],
    "temp": ["store", "°c", "celsius", "temperature"],
    "sterility": ["steril", "eo", "gamma", "steam", "autoclave", "sterile"],
    "sterile": ["steril", "eo", "gamma", "steam", "resterilize"],
    "contraindication": ["contraindicat", "warning", "caution", "do not"],
    "warning": ["warning", "caution", "rx only", "single use", "hazard", "adverse"],
    "caution": ["caution", "warning", "precaution"],
    "udi": ["udi", "(01)", "gtin", "barcode", "identifier"],
    "gtin": ["gtin", "(01)", "udi"],
    "batch": ["lot", "batch", "(10)"],
    "lot": ["lot", "batch", "(10)"],
    "serial": ["serial", "sn", "(21)"],
    "manufacturer": ["manufactur", "street", "suite", "inc", "corp", "ltd", "gmbh", "address"],
    "maker": ["manufactur", "address"],
    "address": ["street", "suite", "way", "road", "ave", "address", "city", "usa"],
    "latex": ["latex", "rubber"],
    "pediatric": ["pediatric", "children", "child", "infant"],
}


class GroundedChatService:
    """
    Grounded RAG chat service for medical device label review.
    Enforces strict evidence citations [p. X, block Y] and zero-hallucination abstention (AIAS-03, AIAS-04).
    Guarantees 100% deterministic operation when offline (AIAS-05).
    """

    @classmethod
    async def answer_query(
        cls,
        db: AsyncSession,
        review_id: str,
        query: str,
        document_role: str = "revised",
    ) -> ChatMessageResponse:
        clean_query = query.strip()
        if not clean_query:
            return ChatMessageResponse(
                answer="Please provide a valid question regarding the medical device label.",
                citations=[],
                is_abstained=True,
                engine="deterministic",
            )

        # 1. Fetch Review
        r_stmt = select(Review).where(Review.id == review_id)
        r_res = await db.execute(r_stmt)
        review = r_res.scalar_one_or_none()
        if not review:
            return ChatMessageResponse(
                answer=f"Review '{review_id}' was not found in the database.",
                citations=[],
                is_abstained=True,
                engine="deterministic",
            )

        # 2. Determine target document ID
        target_role = document_role.lower() if document_role else "revised"
        doc_id = review.revised_document_id if target_role == "revised" else review.baseline_document_id
        if not doc_id:
            # Fallback to whatever document exists
            doc_id = review.revised_document_id or review.baseline_document_id

        if not doc_id:
            return ChatMessageResponse(
                answer=f"No {target_role} document is attached to this review.",
                citations=[],
                is_abstained=True,
                engine="deterministic",
            )

        # 3. Retrieve TextBlocks
        b_stmt = select(TextBlock).where(TextBlock.document_id == doc_id).order_by(TextBlock.page_number, TextBlock.block_index)
        b_res = await db.execute(b_stmt)
        blocks: List[TextBlock] = list(b_res.scalars().all())

        if not blocks:
            return ChatMessageResponse(
                answer="The target document contains no extracted text blocks to evaluate.",
                citations=[],
                is_abstained=True,
                engine="deterministic",
            )

        # 4. Score and Rank blocks
        scored_blocks = cls._score_blocks(clean_query, blocks)

        # 5. Abstention Evaluation (AIAS-04)
        if not scored_blocks or scored_blocks[0][0] <= 0.0:
            return ChatMessageResponse(
                answer=(
                    f"Based on the ingested label documentation ({target_role} label), no evidence was found regarding "
                    f"'{clean_query}'. The document does not contain statements covering this parameter."
                ),
                citations=[],
                is_abstained=True,
                engine="deterministic",
            )

        # 6. Extract Top Evidence Chunks (Top 1 to 3)
        top_matches = [b for score, b in scored_blocks[:3] if score > 0.0]
        citations: List[CitationReference] = []

        for b in top_matches:
            citations.append(
                CitationReference(
                    page_number=b.page_number,
                    block_index=b.block_index,
                    document_role=target_role,
                    norm_x0=round(float(b.norm_x0), 4),
                    norm_y0=round(float(b.norm_y0), 4),
                    norm_x1=round(float(b.norm_x1), 4),
                    norm_y1=round(float(b.norm_y1), 4),
                    snippet=b.text.strip(),
                )
            )

        # 7. Grounded Answer Synthesis with Bracketed Citations (AIAS-03)
        if len(citations) == 1:
            top_cit = citations[0]
            answer = (
                f"According to [p. {top_cit.page_number}, block {top_cit.block_index}], the label specifies: "
                f"\"{top_cit.snippet}\"."
            )
        else:
            chunks_text = "\n".join(
                f"- \"{c.snippet}\" [p. {c.page_number}, block {c.block_index}]"
                for c in citations
            )
            answer = (
                f"Evidence identified across {len(citations)} sections in the {target_role} label:\n"
                f"{chunks_text}"
            )

        return ChatMessageResponse(
            answer=answer,
            citations=citations,
            is_abstained=False,
            engine="deterministic",
        )

    @classmethod
    def _score_blocks(cls, query: str, blocks: List[TextBlock]) -> List[Tuple[float, TextBlock]]:
        """
        Calculates lexical relevance score for each text block against the query.
        """
        raw_tokens = [t for t in re.findall(r"[a-z0-9°]+", query.lower()) if len(t) > 1]
        tokens = [t for t in raw_tokens if t not in STOP_WORDS]
        if not tokens:
            tokens = raw_tokens

        # Expand tokens using synonym map
        expanded_keywords = set(tokens)
        for t in tokens:
            if t in SYNONYM_MAP:
                expanded_keywords.update(SYNONYM_MAP[t])

        scored: List[Tuple[float, TextBlock]] = []
        for b in blocks:
            b_text = b.text.lower()
            score = 0.0

            # Exact whole-query substring bonus
            if len(query) > 3 and query.lower() in b_text:
                score += 5.0

            # Match expanded keywords
            for kw in expanded_keywords:
                if kw in b_text:
                    # Direct word match gets higher weight
                    pattern = rf"\b{re.escape(kw)}\b"
                    if re.search(pattern, b_text):
                        score += 2.0
                    else:
                        score += 1.0

            # Normalized coordinate position slight tie-breaker (top blocks usually header/important)
            if score > 0.0:
                score += max(0.0, 0.1 - (b.norm_y0 * 0.05))

            scored.append((score, b))

        # Sort descending by score
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored
