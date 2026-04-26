# autoloop

import os
import time
import uuid
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from rag_pipe import validate_template_pipeline, generate_redrafts, load_models

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

print("Initializing AI Models...")
GLOBAL_LLM, GLOBAL_VS, GLOBAL_RERANKER = load_models(".env")
print("Models loaded successfully into memory. Starting polling...")

def process_ai_flags(conn):
    query = text("""
        SELECT id, content, title
        FROM Template
        WHERE status = 'pending_ai_flags'
    """)
    templates = conn.execute(query).fetchall()

    if not templates:
        print("[HEARTBEAT] Scanning... No new 'pending_ai_flags' found.")
        return

    for row in templates:
        t_id = row.id
        content = row.content

        print(f"\n[AI FLAGS] Processing Template ID: {t_id}")

        conn.execute(text("""
            UPDATE Template
            SET status = 'processing_ai_flags'
            WHERE id = :id
        """), {"id": t_id})

        try:
            result = validate_template_pipeline(content, GLOBAL_LLM, GLOBAL_VS, GLOBAL_RERANKER)

            for flag in result.get("flags", []):
                conn.execute(text("""
                    INSERT INTO LegalFlag (id, templateId, cfr_section, explanation, status, createdAt)
                    VALUES (:id, :tid, :rule, :exp, :status, CURRENT_TIMESTAMP)
                """), {
                    "id": str(uuid.uuid4()),
                    "tid": t_id,
                    "rule": flag.get("cfr_section"),
                    "exp": flag.get("explanation"),
                    "status": flag.get("status", "pending")
                })

            conn.execute(text("""
                UPDATE Template
                SET status = 'pending_legal', updatedAt = CURRENT_TIMESTAMP
                WHERE id = :id
            """), {"id": t_id})
            
            print(f"[SUCCESS] Template {t_id} processed and moved to 'pending_legal'.")

        except Exception as e:
            print(f"[ERROR - FLAGS] Template {t_id} failed: {e}")
            conn.execute(text("""
                UPDATE Template
                SET status = 'error_ai_flags', updatedAt = CURRENT_TIMESTAMP
                WHERE id = :id
            """), {"id": t_id})

def process_ai_redrafts(conn):
    query = text("""
        SELECT id, content
        FROM Template
        WHERE status = 'pending_ai_redrafts'
    """)
    templates = conn.execute(query).fetchall()

    if not templates:
        print("[HEARTBEAT] Scanning... No new 'pending_ai_redrafts' found.")
        return

    for row in templates:
        t_id = row.id
        content = row.content

        print(f"\n[AI REDRAFT] Processing Template ID: {t_id}")

        conn.execute(text("""
            UPDATE Template
            SET status = 'processing_ai_redrafts'
            WHERE id = :id
        """), {"id": t_id})

        try:
            confirmed_flags = conn.execute(text("""
                SELECT cfr_section, explanation
                FROM LegalFlag
                WHERE templateId = :tid AND status = 'confirmed'
            """), {"tid": t_id}).fetchall()

            if not confirmed_flags:
                print(f"[AI REDRAFT] No confirmed flags for Template {t_id}. Bypassing redraft.")
                conn.execute(text("""
                    UPDATE Template
                    SET status = 'pending_client_action', updatedAt = CURRENT_TIMESTAMP
                    WHERE id = :id
                """), {"id": t_id})
                continue

            violations = {
                "rules": [
                    {
                        "rule": f.cfr_section,
                        "explanation": f.explanation
                    }
                    for f in confirmed_flags
                ]
            }

            suggestions = generate_redrafts(content, violations, GLOBAL_LLM)

            for key in ["suggestion_1", "suggestion_2"]:
                if key in suggestions:
                    conn.execute(text("""
                        INSERT INTO RedraftedTemplate (id, templateId, modContent, status, createdAt)
                        VALUES (:id, :tid, :content, 'pending', CURRENT_TIMESTAMP)
                    """), {
                        "id": str(uuid.uuid4()),
                        "tid": t_id,
                        "content": suggestions[key]
                    })

            conn.execute(text("""
                UPDATE Template
                SET status = 'pending_client_action', updatedAt = CURRENT_TIMESTAMP
                WHERE id = :id
            """), {"id": t_id})
            print(f"[SUCCESS] Template {t_id} redrafted and moved to 'pending_client_action'.")

        except Exception as e:
            print(f"[ERROR - REDRAFT] Template {t_id} failed: {e}")
            conn.execute(text("""
                UPDATE Template
                SET status = 'error_ai_redrafts', updatedAt = CURRENT_TIMESTAMP
                WHERE id = :id
            """), {"id": t_id})

def main():
    while True:
        try:
            with engine.begin() as conn:
                process_ai_flags(conn)
                process_ai_redrafts(conn)
                
        except Exception as e:
            print(f"[FATAL DB ERROR]: {e}")

        print("-" * 40)
        time.sleep(5)

if __name__ == "__main__":
    main()