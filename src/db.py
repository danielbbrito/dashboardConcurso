import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

import pandas as pd

_RAIZ = Path(__file__).resolve().parent.parent
DB_PATH = os.environ.get("ESTUDOS_DB_PATH", str(_RAIZ / "data" / "estudos.db"))
DB_URL = os.environ.get("ESTUDOS_DB_URL", "")
DB_TOKEN = os.environ.get("ESTUDOS_DB_TOKEN", "")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS disciplinas (
    id          INTEGER PRIMARY KEY,
    nome        TEXT NOT NULL UNIQUE,
    bloco       TEXT NOT NULL CHECK (bloco IN ('basico', 'especifico')),
    itens_prova INTEGER NOT NULL CHECK (itens_prova > 0),
    ordem       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registros (
    id            INTEGER PRIMARY KEY,
    data          TEXT NOT NULL,
    disciplina_id INTEGER NOT NULL REFERENCES disciplinas(id),
    feitas        INTEGER NOT NULL CHECK (feitas >= 1),
    acertos       INTEGER NOT NULL CHECK (acertos >= 0),
    chutes        INTEGER NOT NULL DEFAULT 0 CHECK (chutes >= 0),
    chutes_certos INTEGER NOT NULL DEFAULT 0 CHECK (chutes_certos >= 0),
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (acertos <= feitas),
    CHECK (chutes <= feitas),
    CHECK (chutes_certos <= acertos),
    CHECK (chutes_certos <= chutes)
);

CREATE INDEX IF NOT EXISTS idx_registros_data        ON registros(data);
CREATE INDEX IF NOT EXISTS idx_registros_disciplina  ON registros(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_registros_data_disc   ON registros(data, disciplina_id);

CREATE TABLE IF NOT EXISTS anotacoes (
    disciplina_id INTEGER PRIMARY KEY REFERENCES disciplinas(id),
    texto         TEXT NOT NULL DEFAULT '',
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def _conectar():
    if DB_URL:
        import libsql_experimental as libsql

        return libsql.connect(DB_URL, auth_token=DB_TOKEN)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_conn():
    conn = _conectar()
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _params_tuple(params):
    return tuple(params) if params else ()


def query_rows(conn, sql, params=None):
    cur = conn.execute(sql, _params_tuple(params))
    cols = [d[0] for d in cur.description] if cur.description else []
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def query_df(conn, sql, params=None):
    cur = conn.execute(sql, _params_tuple(params))
    cols = [d[0] for d in cur.description] if cur.description else []
    return pd.DataFrame(cur.fetchall(), columns=cols)


def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(_SCHEMA)
    from .seed import seed_disciplinas

    seed_disciplinas()