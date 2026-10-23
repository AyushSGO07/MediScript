from sqlalchemy import select
from app.db.session import sync_engine, SyncSessionLocal
from app.models.base import Base
# Import all models so that Base.metadata knows about all tables
import app.models  # noqa: F401
from app.models.workspace import Workspace

def init_db():
    # Create all tables synchronously
    Base.metadata.create_all(bind=sync_engine)
    
    # Check for incremental schema column migrations
    with sync_engine.connect() as conn:
        cursor = conn.exec_driver_sql("PRAGMA table_info(findings)")
        columns = [row[1] for row in cursor.fetchall()]
        if "diff_item_id" not in columns:
            conn.exec_driver_sql("ALTER TABLE findings ADD COLUMN diff_item_id VARCHAR(36) REFERENCES diff_items(id) ON DELETE SET NULL")
            conn.commit()
            print("[InitDB] Added diff_item_id column to findings table.")

    # Ensure default workspace exists
    with SyncSessionLocal() as session:
        result = session.execute(select(Workspace).limit(1))
        workspace = result.scalar_one_or_none()
        if not workspace:
            workspace = Workspace(
                name="Tata Elxsi Lab",
                description="Default regulatory verification workspace",
            )
            session.add(workspace)
            session.commit()
            print("[InitDB] Created default workspace: Tata Elxsi Lab")
        else:
            print(f"[InitDB] Existing workspace found: {workspace.name}")

if __name__ == "__main__":
    init_db()
