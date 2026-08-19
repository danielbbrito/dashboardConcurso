def test_montar_ciclo_ordem_padrao():
    from src.ciclo import montar_ciclo

    disc = [
        {"id": 1, "nome": "A", "bloco": "basico"},
        {"id": 2, "nome": "B", "bloco": "especifico"},
    ]
    ciclo = montar_ciclo(disc, {1: 6.0, 2: 3.0})
    assert [c["id"] for c in ciclo] == [1, 2]
    assert ciclo[0]["horas"] == 6.0
    assert ciclo[0]["bloco"] == "basico"
    assert ciclo[1]["horas"] == 3.0


def test_montar_ciclo_ordem_custom():
    from src.ciclo import montar_ciclo

    disc = [
        {"id": 1, "nome": "A", "bloco": "basico"},
        {"id": 2, "nome": "B", "bloco": "basico"},
        {"id": 3, "nome": "C", "bloco": "especifico"},
    ]
    ciclo = montar_ciclo(disc, {1: 2.0, 3: 4.0}, ids_ordem=[3, 1, 2])
    assert [c["id"] for c in ciclo] == [3, 1, 2]
    assert ciclo[0]["horas"] == 4.0
    assert ciclo[1]["horas"] == 2.0
    assert ciclo[2]["horas"] == 1.0


def test_montar_ciclo_horas_padrao():
    from src.ciclo import montar_ciclo

    ciclo = montar_ciclo([{"id": 1, "nome": "A", "bloco": "basico"}], {})
    assert ciclo[0]["horas"] == 1.0


def test_montar_ciclo_ignora_ids_invalidos():
    from src.ciclo import montar_ciclo

    disc = [{"id": 1, "nome": "A", "bloco": "basico"}]
    ciclo = montar_ciclo(disc, {}, ids_ordem=[9, 1])
    assert [c["id"] for c in ciclo] == [1]


def test_resolver_permutacao_sem_duplicata():
    from src.ciclo import resolver_permutacao

    antigo = ["A", "B", "C", "D"]
    novo = ["C", "B", "A", "D"]
    assert resolver_permutacao(antigo, novo) == ["C", "B", "A", "D"]


def test_resolver_permutacao_swap():
    from src.ciclo import resolver_permutacao

    antigo = ["A", "B", "C", "D", "E"]
    novo = ["C", "B", "C", "D", "E"]
    assert resolver_permutacao(antigo, novo) == ["C", "B", "A", "D", "E"]


def test_resolver_permutacao_dois_movimentos():
    from src.ciclo import resolver_permutacao

    antigo = ["A", "B", "C", "D"]
    novo = ["C", "A", "C", "D"]
    assert resolver_permutacao(antigo, novo) == ["C", "A", "B", "D"]


def test_resolver_permutacao_sempre_valida():
    from src.ciclo import resolver_permutacao

    antigo = list("ABCDEFGHIJ")
    casos = [
        ["A", "A", "A", "B", "C", "D", "E", "F", "G", "H"],
        ["A", "A", "B", "B", "C", "D", "E", "F", "G", "H"],
        ["J", "I", "H", "G", "F", "E", "D", "C", "B", "A"],
        ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    ]
    for caso in casos:
        saida = resolver_permutacao(antigo, caso)
        assert len(set(saida)) == len(saida), saida
        assert set(saida) == set(antigo), saida
