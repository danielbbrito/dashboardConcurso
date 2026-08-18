from datetime import date

from .db import get_conn, query_df, query_rows


def list_disciplinas():
    with get_conn() as conn:
        return query_rows(conn, "SELECT * FROM disciplinas ORDER BY ordem")


def insert_registro(data, disciplina_id, feitas, acertos, chutes, chutes_certos):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO registros (data, disciplina_id, feitas, acertos, chutes, chutes_certos)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (data, disciplina_id, feitas, acertos, chutes, chutes_certos),
        )


def delete_registro(registro_id):
    with get_conn() as conn:
        conn.execute("DELETE FROM registros WHERE id = ?", (int(registro_id),))


def count_registros(data, disciplina_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) FROM registros WHERE data = ? AND disciplina_id = ?",
            (data, disciplina_id),
        ).fetchone()
        return row[0]


def _clausulas_filtro(inicio=None, fim=None, disciplina_ids=None):
    wheres, params = [], []
    if inicio:
        wheres.append("r.data >= ?")
        params.append(inicio)
    if fim:
        wheres.append("r.data <= ?")
        params.append(fim)
    if disciplina_ids:
        placeholders = ", ".join("?" for _ in disciplina_ids)
        wheres.append(f"r.disciplina_id IN ({placeholders})")
        params.extend(int(v) for v in disciplina_ids)
    return wheres, params


_SELECT_BASE = """
SELECT r.id, r.data, r.disciplina_id, d.nome, d.bloco,
       r.feitas, r.acertos, r.chutes, r.chutes_certos, r.criado_em
FROM registros r
JOIN disciplinas d ON d.id = r.disciplina_id
"""


def list_registros(inicio=None, fim=None, disciplina_ids=None, limit=None):
    wheres, params = _clausulas_filtro(inicio, fim, disciplina_ids)
    sql = _SELECT_BASE
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " ORDER BY r.data DESC, r.id DESC"
    if limit:
        sql += " LIMIT ?"
        params.append(limit)
    with get_conn() as conn:
        return query_df(conn, sql, params)


def agg_por_dia(inicio=None, fim=None, disciplina_ids=None):
    wheres, params = _clausulas_filtro(inicio, fim, disciplina_ids)
    sql = """
    SELECT r.data,
           SUM(r.feitas) AS feitas,
           SUM(r.acertos) AS acertos,
           SUM(r.chutes) AS chutes,
           SUM(r.chutes_certos) AS chutes_certos,
           COUNT(*) AS n_registros
    FROM registros r
    JOIN disciplinas d ON d.id = r.disciplina_id
    """
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " GROUP BY r.data ORDER BY r.data"
    with get_conn() as conn:
        return query_df(conn, sql, params)


def agg_por_disciplina(inicio=None, fim=None, disciplina_ids=None):
    wheres, params = _clausulas_filtro(inicio, fim, disciplina_ids)
    sql = """
    SELECT r.disciplina_id, d.nome, d.bloco, d.ordem,
           SUM(r.feitas) AS feitas,
           SUM(r.acertos) AS acertos,
           SUM(r.chutes) AS chutes,
           SUM(r.chutes_certos) AS chutes_certos
    FROM registros r
    JOIN disciplinas d ON d.id = r.disciplina_id
    """
    if wheres:
        sql += " WHERE " + " AND ".join(wheres)
    sql += " GROUP BY r.disciplina_id ORDER BY d.ordem"
    with get_conn() as conn:
        return query_df(conn, sql, params)


def snapshot_ate(corte, disciplina_ids=None):
    wheres = ["r.data <= ?"]
    params = [str(corte)]
    if disciplina_ids:
        placeholders = ", ".join("?" for _ in disciplina_ids)
        wheres.append(f"r.disciplina_id IN ({placeholders})")
        params.extend(int(v) for v in disciplina_ids)
    sql = _SELECT_BASE + " WHERE " + " AND ".join(wheres) + " ORDER BY r.data, r.id"
    with get_conn() as conn:
        return query_df(conn, sql, params)


def get_anotacao(disciplina_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT texto FROM anotacoes WHERE disciplina_id = ?", (disciplina_id,)
        ).fetchone()
        return row[0] if row else ""


def get_anotacao_atualizado_em(disciplina_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT atualizado_em FROM anotacoes WHERE disciplina_id = ?", (disciplina_id,)
        ).fetchone()
        return row[0] if row else None


def save_anotacao(disciplina_id, texto):
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO anotacoes (disciplina_id, texto, atualizado_em)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT (disciplina_id) DO UPDATE SET
                texto = excluded.texto,
                atualizado_em = datetime('now')
            """,
            (disciplina_id, texto),
        )


def _e_inteiro(v):
    try:
        return float(v).is_integer()
    except (TypeError, ValueError):
        return False


def validar_registro(data, feitas, acertos, chutes, chutes_certos):
    erros = []
    if data is None:
        erros.append("Informe uma data.")
    elif isinstance(data, date) and data > date.today():
        erros.append("A data não pode ser no futuro.")
    if feitas is None or feitas < 1:
        erros.append("Informe pelo menos 1 questão feita.")
    campos = [feitas, acertos, chutes, chutes_certos]
    if not all(_e_inteiro(v) for v in campos):
        erros.append("Use apenas números inteiros.")
    else:
        f, a, c, cc = (int(v) for v in campos)
        if a < 0 or a > f:
            erros.append("Acertos deve estar entre 0 e o total de questões.")
        if c < 0 or c > f:
            erros.append("Chutes deve estar entre 0 e o total de questões.")
        if cc < 0 or cc > min(c, a):
            erros.append("Chutes certos não pode ser maior que os chutes nem que os acertos.")
    return erros