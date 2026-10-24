from datetime import date, timedelta

import pandas as pd

INTERVALOS = [
    ("Semanal", "Sáb"),
]

MARCAS = {tipo: marca for tipo, marca in INTERVALOS}

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
    """Data do sábado seguinte à semana em que a matéria foi estudada."""
    sabado = data + timedelta(days=(5 - data.weekday()) % 7 + 7)
    return [(tipo, sabado) for tipo, _ in INTERVALOS]


def inicio_semana(data):
    """Retorna o domingo que inicia a semana com revisão no sábado seguinte."""
    return data - timedelta(days=(data.weekday() + 1) % 7)


def expandir(df):
    """Programa uma revisão semanal para cada matéria registrada."""
    linhas = []
    for _, r in df.iterrows():
        data_estudo = date.fromisoformat(r["data"])
        for tipo, data_revisao in revisoes_de(data_estudo):
            linhas.append(
                {
                    "id": r["id"],
                    "tipo": tipo,
                    "marca": MARCAS[tipo],
                    "data_estudo": r["data"],
                    "data_revisao": data_revisao.isoformat(),
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


def revisoes_na_semana(df, inicio):
    """Retorna as matérias estudadas de domingo a sábado da semana informada."""
    inicio = inicio_semana(inicio)
    fim = inicio + timedelta(days=6)
    expansao = expandir(df)
    if expansao.empty:
        return expansao
    selecionadas = expansao[
        expansao["data_estudo"].between(inicio.isoformat(), fim.isoformat())
    ]
    return selecionadas.sort_values(
        ["data_estudo", "disciplina", "materia"], kind="stable"
    ).reset_index(drop=True)
