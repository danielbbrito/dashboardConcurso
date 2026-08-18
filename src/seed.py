from .db import get_conn

DISCIPLINAS = [
    ("Língua Portuguesa", "basico", 25, 1),
    ("Noções de Lógica e Estatística", "basico", 10, 2),
    ("Direito Administrativo", "basico", 5, 3),
    ("Fundamentos de Macro e Microeconomia", "basico", 10, 4),
    ("Ciência de Dados", "especifico", 14, 5),
    ("Segurança da Informação", "especifico", 7, 6),
    ("Engenharia de Software", "especifico", 24, 7),
    ("Infraestrutura em TI", "especifico", 17, 8),
    ("Bancos de Dados", "especifico", 4, 9),
    ("Gestão em TI", "especifico", 4, 10),
]


def seed_disciplinas():
    with get_conn() as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO disciplinas (nome, bloco, itens_prova, ordem) VALUES (?, ?, ?, ?)",
            DISCIPLINAS,
        )