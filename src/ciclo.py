def montar_ciclo(disciplinas, horas_por_id, ids_ordem=None):
    """Monta a lista do ciclo na ordem dada (padrão: ordem das disciplinas) com as horas alocadas."""
    por_id = {d["id"]: d for d in disciplinas}
    if not ids_ordem:
        ids_ordem = [d["id"] for d in disciplinas]
    ciclo = []
    for did in ids_ordem:
        if did not in por_id:
            continue
        d = dict(por_id[did])
        d["horas"] = float(horas_por_id.get(did, 1.0))
        ciclo.append(d)
    return ciclo


def resolver_permutacao(antigo, novo):
    """Converte uma seleção (que pode repetir disciplinas) em uma permutação válida.

    Mantém a primeira ocorrência de cada disciplina (a escolha explícita do usuário).
    Para ocorrências repetidas, restaura a disciplina que estava naquela posição na
    ordem anterior, se ainda não alocada; senão, usa a primeira disciplina ainda
    ausente na ordem anterior.
    """
    novo = list(novo)
    colocados = set()
    for i in range(len(novo)):
        if novo[i] in colocados:
            candidato = next(
                (x for x in antigo if x not in colocados and x not in novo[i + 1 :]),
                None,
            )
            if candidato is None:
                candidato = next((x for x in antigo if x not in colocados), None)
            if candidato is not None:
                novo[i] = candidato
        colocados.add(novo[i])
    return novo
