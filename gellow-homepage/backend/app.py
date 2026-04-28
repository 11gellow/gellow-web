from __future__ import annotations

import json
import os
from pathlib import Path

import libsql
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DEFAULT_SCORE_LIMIT = 12
MAX_SCORE_LIMIT = 100
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "").strip()
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "").strip()

DEFAULT_POSTS = [
    {
        "slug": "homepage-structure",
        "title": "把个人主页从单文件拆成正常结构",
        "summary": "记录一下从一个 html 文件开始，慢慢拆成 index.html、style.css、main.js 的过程。",
        "content": "记录一下从一个 html 文件开始，慢慢拆成 index.html、style.css、main.js 的过程。\n\n不求高级，但至少要整齐，后面改起来不恶心。",
        "status": "published",
        "published_at": "2026-04-24",
    },
    {
        "slug": "vercel-domain-static-flow",
        "title": "Vercel、域名和静态页面的最小可用流程",
        "summary": "先把站点跑起来，再慢慢补内容。把部署流程跑通之后，后面只要 push 到 GitHub，页面就能自动更新。",
        "content": "先把站点跑起来，再慢慢补内容。\n\n把部署流程跑通之后，后面只要 push 到 GitHub，页面就能自动更新，这种感觉确实很舒服。",
        "status": "published",
        "published_at": "2026-04-22",
    },
    {
        "slug": "pixel-archive-plan",
        "title": "准备给 blog 加一个像素风归档页",
        "summary": "想把博客做得像老游戏选关界面，不想太花哨，但想保留一点玩具感。",
        "content": "想把博客做得像老游戏选关界面，不想太花哨，但想保留一点玩具感。\n\n可能后面会加 tags、归档、阅读状态和一些小彩蛋。",
        "status": "published",
        "published_at": "2026-04-19",
    },
    {
        "slug": "notes-subsite-migration",
        "title": "把 Notes 整合成 blog 的子网站",
        "summary": "记录把独立 notes 页迁移到 blog.gellow.top/notes 的过程，以及后续准备接入的后台能力。",
        "content": "目标：把 notes 变成 blog.gellow.top/notes。\n\n第一阶段先做 demo 控制台和前台展示，第二阶段再考虑登录、数据库后台和 Markdown 编辑。",
        "status": "draft",
        "published_at": "2026-04-28",
    },
]

DEFAULT_SETTINGS = {
    "featured_latest": [
        "homepage-structure",
        "vercel-domain-static-flow",
        "pixel-archive-plan",
    ],
    "featured_home": [
        "vercel-domain-static-flow",
        "pixel-archive-plan",
        "homepage-structure",
        "notes-subsite-migration",
    ],
    "mission_notes_title": "常用命令速查",
    "mission_notes_items": [
        "pnpm dev / npm run dev / vite",
        "git status / git add . / git commit -m \"message\"",
        "python -m venv .venv / pip install -r requirements.txt",
    ],
}

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")

if not TURSO_DATABASE_URL or not TURSO_AUTH_TOKEN:
    raise RuntimeError(
        "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required. "
        "This backend runs in Turso-only mode."
    )


def get_db_connection():
    return libsql.connect(
        database=TURSO_DATABASE_URL,
        auth_token=TURSO_AUTH_TOKEN,
    )


def serialize_score(row) -> dict[str, object]:
    return {
        "id": row[0],
        "name": row[1],
        "score": row[2],
        "createdAt": row[3],
    }


def serialize_post(row) -> dict[str, object]:
    return {
        "id": row[0],
        "slug": row[1],
        "title": row[2],
        "summary": row[3],
        "content": row[4],
        "status": row[5],
        "publishedAt": row[6],
        "updatedAt": row[7],
    }


def parse_setting_value(raw_value: str):
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return raw_value


def get_settings_map(connection) -> dict[str, object]:
    rows = connection.execute(
        """
        SELECT setting_key, setting_value
        FROM site_settings
        """
    ).fetchall()
    return {row[0]: parse_setting_value(row[1]) for row in rows}


def get_post_row_by_slug(connection, slug: str):
    return connection.execute(
        """
        SELECT id, slug, title, summary, content, status, published_at, updated_at
        FROM blog_posts
        WHERE slug = ?
        """,
        (slug,),
    ).fetchone()


def upsert_setting(connection, key: str, value) -> None:
    connection.execute(
        """
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, datetime('now', 'localtime'))
        ON CONFLICT(setting_key) DO UPDATE SET
            setting_value = excluded.setting_value,
            updated_at = excluded.updated_at
        """,
        (key, json.dumps(value, ensure_ascii=False)),
    )


def init_db() -> None:
    with get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                score INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS blog_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT NOT NULL,
                published_at TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
            """
        )

        existing_posts = connection.execute(
            "SELECT COUNT(*) FROM blog_posts"
        ).fetchone()[0]
        if not existing_posts:
            for post in DEFAULT_POSTS:
                connection.execute(
                    """
                    INSERT INTO blog_posts (slug, title, summary, content, status, published_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        post["slug"],
                        post["title"],
                        post["summary"],
                        post["content"],
                        post["status"],
                        post["published_at"],
                    ),
                )

        settings_map = get_settings_map(connection)
        for key, value in DEFAULT_SETTINGS.items():
            if key not in settings_map:
                upsert_setting(connection, key, value)

        connection.commit()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.get("/api/health")
def health_check():
    return jsonify({"ok": True})


@app.route("/api/<path:_any>", methods=["OPTIONS"])
def handle_options(_any: str):
    return ("", 204)


@app.get("/api/scores")
def get_scores():
    raw_limit = request.args.get("limit", str(DEFAULT_SCORE_LIMIT))

    try:
        limit = int(raw_limit)
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400

    limit = max(1, min(limit, MAX_SCORE_LIMIT))

    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, username, score, created_at
            FROM scores
            ORDER BY score DESC, datetime(created_at) DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return jsonify({"scores": [serialize_score(row) for row in rows]})


@app.post("/api/scores")
def create_score():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    username = str(payload.get("name", "")).strip()
    score = payload.get("score")

    if not username:
        return jsonify({"error": "name is required"}), 400
    if len(username) > 16:
        return jsonify({"error": "name must be 16 characters or fewer"}), 400

    try:
        score_value = int(score)
    except (TypeError, ValueError):
        return jsonify({"error": "score must be an integer"}), 400

    if score_value < 0:
        return jsonify({"error": "score must be non-negative"}), 400

    with get_db_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO scores (username, score)
            VALUES (?, ?)
            RETURNING id, username, score, created_at
            """,
            (username, score_value),
        ).fetchone()
        connection.commit()

    return jsonify({"score": serialize_score(row)}), 201


@app.get("/api/content/public")
def get_public_content():
    with get_db_connection() as connection:
        posts = connection.execute(
            """
            SELECT id, slug, title, summary, content, status, published_at, updated_at
            FROM blog_posts
            WHERE status = 'published'
            ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC, id DESC
            """
        ).fetchall()
        settings_map = get_settings_map(connection)

    return jsonify(
        {
            "posts": [serialize_post(row) for row in posts],
            "settings": settings_map,
        }
    )


@app.get("/api/content/admin")
def get_admin_content():
    with get_db_connection() as connection:
        posts = connection.execute(
            """
            SELECT id, slug, title, summary, content, status, published_at, updated_at
            FROM blog_posts
            ORDER BY datetime(updated_at) DESC, id DESC
            """
        ).fetchall()
        settings_map = get_settings_map(connection)

    return jsonify(
        {
            "posts": [serialize_post(row) for row in posts],
            "settings": settings_map,
        }
    )


@app.get("/api/content/posts/<slug>")
def get_post_by_slug(slug: str):
    with get_db_connection() as connection:
        row = get_post_row_by_slug(connection, slug)

    if row is None:
        return jsonify({"error": "post not found"}), 404
    if row[5] != "published":
        return jsonify({"error": "post not found"}), 404

    return jsonify({"post": serialize_post(row)})


@app.post("/api/content/posts")
def save_post():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    post_id = payload.get("id")
    title = str(payload.get("title", "")).strip()
    slug = str(payload.get("slug", "")).strip()
    summary = str(payload.get("summary", "")).strip()
    content = str(payload.get("content", "")).strip()
    status = str(payload.get("status", "draft")).strip()
    published_at = str(payload.get("publishedAt", "")).strip()

    if not title or not slug or not summary or not content or not published_at:
        return jsonify({"error": "title, slug, summary, content and publishedAt are required"}), 400

    if status not in {"draft", "published", "archived"}:
        return jsonify({"error": "invalid status"}), 400

    with get_db_connection() as connection:
        duplicate_row = get_post_row_by_slug(connection, slug)
        if duplicate_row and int(duplicate_row[0]) != int(post_id or 0):
            return jsonify({"error": "slug already exists"}), 400

        if post_id:
            row = connection.execute(
                """
                UPDATE blog_posts
                SET slug = ?, title = ?, summary = ?, content = ?, status = ?, published_at = ?,
                    updated_at = datetime('now', 'localtime')
                WHERE id = ?
                RETURNING id, slug, title, summary, content, status, published_at, updated_at
                """,
                (slug, title, summary, content, status, published_at, post_id),
            ).fetchone()
            if row is None:
                return jsonify({"error": "post not found"}), 404
        else:
            row = connection.execute(
                """
                INSERT INTO blog_posts (slug, title, summary, content, status, published_at)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id, slug, title, summary, content, status, published_at, updated_at
                """,
                (slug, title, summary, content, status, published_at),
            ).fetchone()

        connection.commit()

    return jsonify({"post": serialize_post(row)})


@app.delete("/api/content/posts/<int:post_id>")
def delete_post(post_id: int):
    with get_db_connection() as connection:
        connection.execute("DELETE FROM blog_posts WHERE id = ?", (post_id,))
        connection.commit()
    return jsonify({"ok": True})


@app.put("/api/content/settings")
def save_settings():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "request body must be JSON"}), 400

    featured_latest = payload.get("featured_latest", [])
    featured_home = payload.get("featured_home", [])
    mission_notes_title = str(payload.get("mission_notes_title", "")).strip()
    mission_notes_items = payload.get("mission_notes_items", [])

    if not isinstance(featured_latest, list) or not isinstance(featured_home, list):
        return jsonify({"error": "featured lists must be arrays"}), 400
    if not isinstance(mission_notes_items, list):
        return jsonify({"error": "mission_notes_items must be an array"}), 400
    if not mission_notes_title:
        return jsonify({"error": "mission_notes_title is required"}), 400

    with get_db_connection() as connection:
        upsert_setting(connection, "featured_latest", featured_latest)
        upsert_setting(connection, "featured_home", featured_home)
        upsert_setting(connection, "mission_notes_title", mission_notes_title)
        upsert_setting(connection, "mission_notes_items", mission_notes_items)
        connection.commit()
        settings_map = get_settings_map(connection)

    return jsonify({"settings": settings_map})


@app.get("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:path>")
def serve_frontend_asset(path: str):
    asset_path = FRONTEND_DIR / path
    if asset_path.is_file():
        return send_from_directory(FRONTEND_DIR, path)

    return send_from_directory(FRONTEND_DIR, "index.html")


init_db()


if __name__ == "__main__":
    app.run(debug=True)
