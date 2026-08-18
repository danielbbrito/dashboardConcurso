import argparse
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import db, repository
from src.db import init_db

PESOS = {
    "Engenharia de Software": 5,
    "Língua Portuguesa": 4,
    "Infraestrutura em TI": 3,
    "Ciência de Dados": 3,
    "Noções de Lógica e Estatística": 2,
    "Segurança da Informação": 2,
    "Fundamentos de Macro e Microeconomia": 2,
    "Direito Administrativo": 1,
    "Bancos de Dados": 1,
    "Gestão em TI": 1,
}

TAXAS = {
    "Língua Portuguesa": 0.82,
    "Noções de Lógica e Estatística": 0.72,
    "Direito Administrativo": 0.62,
    "Fundamentos de Macro e Microeconomia": 0.58,
    "Ciência de Dados": 0.74,
    "Segurança da Informação": 0.68,
    "Engenharia de Software": 0.78,
    "Infraestrutura em TI": 0.70,
    "Bancos de Dados": 0.55,
    "Gestão em TI": 0.64,
}


def main():
    parser = argparse.ArgumentParser(description="Gera massa de dados sintética para validar o dashboard.")
    parser.add_argument("--apagar", action="store_true", help="Limpa a tabela registros antes de inserir")
    parser.add_argument("--dias", type=int, default=60, help="Número de dias de histórico a gerar")
    args = parser.parse_args()

    init_db()

    if not args.apagar and repository.list_registros().shape[0] > 0:
        print("Já existem registros. Use --apagar para limpar antes (o banco é um único arquivo: faça backup de data/estudos.db).")
        return

    if args.apagar:
        with db.get_conn() as conn:
            conn.execute("DELETE FROM registros")

    random.seed(42)
    disciplinas = repository.list_disciplinas()
    pesos = [PESOS.get(d["nome"], 1) for d in disciplinas]
    fim = date.today()
    inicio = fim - timedelta(days=args.dias - 1)

    n = 0
    for offset in range(args.dias):
        dia = inicio + timedelta(days=offset)
        if random.random() < 0.15:
            continue
        for disc in random.choices(disciplinas, weights=pesos, k=random.randint(1, 3)):
            taxa = max(0.4, min(0.9, TAXAS.get(disc["nome"], 0.7) + random.uniform(-0.12, 0.12)))
            feitas = random.choice([5, 10, 15, 20, 25])
            acertos = round(feitas * taxa)
            pct_chute = 0.1 if TAXAS.get(disc["nome"], 0.7) > 0.75 else 0.3
            chutes = random.randint(0, round(feitas * pct_chute))
            chutes_certos = random.randint(0, min(chutes, round(acertos * 0.5)))
            repository.insert_registro(str(dia), disc["id"], feitas, acertos, chutes, chutes_certos)
            n += 1

    print(f"OK: {n} registros sintéticos inseridos entre {inicio} e {fim}.")


if __name__ == "__main__":
    main()