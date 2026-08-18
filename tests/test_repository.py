import sqlite3

import pytest


@pytest.fixture
def repo_db(tmp_path, monkeypatch):
    import src.db as db

    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "test.db"))
    db.init_db()
    return db


def test_init_idempotente(repo_db):
    import src.db as db
    from src import repository

    db.init_db()
    db.init_db()
    with db.get_conn() as conn:
        n = conn.execute("SELECT COUNT(*) FROM disciplinas").fetchone()[0]
        tabelas = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert n == 10
    assert {"disciplinas", "registros", "anotacoes"} <= tabelas
    assert len(repository.list_disciplinas()) == 10


def test_insert_e_list(repo_db):
    from src import repository

    repository.insert_registro("2026-08-17", 1, 10, 8, 2, 1)
    df = repository.list_registros()
    assert len(df) == 1
    row = df.iloc[0]
    assert row["data"] == "2026-08-17"
    assert row["disciplina_id"] == 1
    assert row["feitas"] == 10
    assert row["acertos"] == 8
    assert row["chutes"] == 2
    assert row["chutes_certos"] == 1
    assert row["nome"] == "Língua Portuguesa"


def test_filtros(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 5, 4, 0, 0)
    repository.insert_registro("2026-08-10", 2, 6, 5, 1, 0)
    repository.insert_registro("2026-08-20", 3, 7, 6, 2, 1)
    df = repository.list_registros(inicio="2026-08-02", fim="2026-08-15")
    assert len(df) == 1
    assert df.iloc[0]["disciplina_id"] == 2
    df = repository.list_registros(disciplina_ids=[1, 3])
    assert set(df["disciplina_id"]) == {1, 3}
    df = repository.list_registros(inicio="2026-08-01", fim="2026-08-01")
    assert len(df) == 1


def test_delete(repo_db):
    from src import repository

    repository.insert_registro("2026-08-17", 1, 10, 8, 2, 1)
    rid = repository.list_registros().iloc[0]["id"]
    repository.delete_registro(rid)
    assert repository.list_registros().empty
    repository.delete_registro(9999)


def test_check_constraint(repo_db):
    from src import repository

    with pytest.raises(sqlite3.IntegrityError):
        repository.insert_registro("2026-08-17", 1, 10, 11, 0, 0)


def test_anotacoes_upsert(repo_db):
    from src import repository

    repository.save_anotacao(1, "texto v1")
    repository.save_anotacao(1, "texto v2")
    assert repository.get_anotacao(1) == "texto v2"
    assert repository.get_anotacao_atualizado_em(1) is not None
    with repo_db.get_conn() as conn:
        n = conn.execute("SELECT COUNT(*) FROM anotacoes").fetchone()[0]
    assert n == 1


def test_agg_por_disciplina(repo_db):
    from src import repository

    repository.insert_registro("2026-08-01", 1, 10, 8, 2, 1)
    repository.insert_registro("2026-08-02", 1, 5, 2, 1, 0)
    repository.insert_registro("2026-08-03", 2, 20, 10, 5, 2)
    df = repository.agg_por_disciplina()
    assert len(df) == 2
    l1 = df[df["disciplina_id"] == 1].iloc[0]
    assert l1["feitas"] == 15
    assert l1["acertos"] == 10
    assert l1["nome"] == "Língua Portuguesa"
    assert l1["bloco"] == "basico"


def test_validar_registro():
    from datetime import date, timedelta

    from src import repository

    hoje = date.today()
    assert repository.validar_registro(hoje, 10, 8, 2, 1) == []
    assert repository.validar_registro(hoje + timedelta(days=1), 10, 8, 2, 1) == [
        "A data não pode ser no futuro."
    ]
    assert repository.validar_registro(hoje, 0, 0, 0, 0) == [
        "Informe pelo menos 1 questão feita."
    ]
    assert repository.validar_registro(hoje, 10, 11, 0, 0) == [
        "Acertos deve estar entre 0 e o total de questões."
    ]
    assert repository.validar_registro(hoje, 10, 8, 3, 4) == [
        "Chutes certos não pode ser maior que os chutes nem que os acertos."
    ]
    assert repository.validar_registro(hoje, 10.5, 8, 2, 1) == ["Use apenas números inteiros."]