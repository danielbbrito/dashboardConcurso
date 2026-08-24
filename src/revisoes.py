from datetime import date, timedelta

import pandas as pd

INTERVALOS = [
    ("24h", "1d", timedelta(days=1)),
    ("7 dias", "7d", timedelta(days=7)),
    ("30 dias", "30d", timedelta(days=30)),
]

MARCAS = {tipo: marca for tipo, marca, _ in INTERVALOS}

COLUNAS = [
    "id",
    "tipo",
    "marca",
    "data_estudo",
    "data_revisao",
    "disciplina_id",
    "disciplina",
    "materia",
    "submateria",
]


def revisoes_de(data):
    """Datas de revisão para uma matéria estudada em `data` (24h, 7 e 30 dias)."""
    return [(tipo, data + delta) for tipo, _, delta in INTERVALOS]


def expandir(df):
    """Expande cada matéria registrada nas suas 3 datas de revisão."""
    linhas = []
    for _, r in df.iterrows():
        data_estudo = date.fromisoformat(r["data"])
        for tipo, _, delta in INTERVALOS:
            linhas.append(
                {
                    "id": r["id"],
                    "tipo": tipo,
                    "marca": MARCAS[tipo],
                    "data_estudo": r["data"],
                    "data_revisao": (data_estudo + delta).isoformat(),
                    "disciplina_id": r["disciplina_id"],
                    "disciplina": r["nome"],
                    "materia": r["materia"],
                    "submateria": r["submateria"],
                }
            )
    return pd.DataFrame(linhas, columns=COLUNAS)


def mapa_revisoes(df):
    """data_revisao (ISO) -> lista de revisões agendadas naquele dia."""
    mapa = {}
    for _, linha in expandir(df).iterrows():
        mapa.setdefault(linha["data_revisao"], []).append(linha.to_dict())
    return mapa


def mapa_estudos(df):
    """data do estudo (ISO) -> lista de matérias estudadas naquele dia."""
    mapa = {}
    for _, r in df.iterrows():
        mapa.setdefault(r["data"], []).append(r.to_dict())
    return mapa
