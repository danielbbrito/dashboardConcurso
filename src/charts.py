import pandas as pd
import plotly.graph_objects as go

from .theme import AZUL_300, AZUL_500, AZUL_600, AZUL_800, NEUTRO


def _figura_vazia(msg="Sem dados para exibir."):
    fig = go.Figure()
    fig.add_annotation(
        text=msg, xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False
    )
    fig.update_layout(height=220, margin=dict(l=10, r=10, t=10, b=10))
    return fig


def _agregar_semanal(serie):
    df = serie.copy()
    df["dt"] = pd.to_datetime(df["data"])
    sem = (
        df[["dt", "feitas", "acertos", "chutes", "chutes_certos"]]
        .set_index("dt")
        .resample("W")
        .sum()
        .reset_index()
    )
    sem["feitas_acum"] = sem["feitas"].cumsum()
    sem["acertos_acum"] = sem["acertos"].cumsum()
    sem["chutes_acum"] = sem["chutes"].cumsum()
    sem["chutes_certos_acum"] = sem["chutes_certos"].cumsum()
    sem["taxa_acum"] = sem["acertos_acum"] / sem["feitas_acum"]
    sem["taxa_acum_seguro"] = (
        sem["acertos_acum"] - sem["chutes_certos_acum"]
    ) / sem["feitas_acum"]
    sem["data"] = sem["dt"].dt.strftime("%Y-%m-%d")
    return sem


def fig_evolucao(serie, mostrar_taxa_segura=False):
    if serie.empty:
        return _figura_vazia()
    if len(serie) > 1:
        span = (
            pd.to_datetime(serie["data"].max()) - pd.to_datetime(serie["data"].min())
        ).days
        if span >= 60:
            serie = _agregar_semanal(serie)
    x = serie["data"]
    fig = go.Figure()
    fig.add_bar(
        x=x,
        y=serie["feitas"],
        name="Questões feitas",
        marker_color=AZUL_300,
        hovertemplate="%{x}<br>Feitas: %{y}<extra></extra>",
    )
    fig.add_scatter(
        x=x,
        y=serie["taxa_acum"] * 100,
        name="Taxa de acerto acumulada",
        yaxis="y2",
        mode="lines+markers",
        line=dict(color=AZUL_800, width=2.5),
        marker=dict(size=6),
        hovertemplate="%{x}<br>Taxa acumulada: %{y:.1f}%<extra></extra>",
    )
    if mostrar_taxa_segura:
        fig.add_scatter(
            x=x,
            y=serie["taxa_acum_seguro"] * 100,
            name="Taxa sem chute acumulada",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color=AZUL_500, width=2, dash="dot"),
            marker=dict(size=5),
            hovertemplate="%{x}<br>Taxa sem chute: %{y:.1f}%<extra></extra>",
        )
    fig.update_layout(
        bargap=0.25,
        yaxis=dict(title="Feitas"),
        yaxis2=dict(
            title="Taxa (%)", overlaying="y", side="right", range=[0, 100], showgrid=False
        ),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
        hovermode="x unified",
        height=360,
        margin=dict(l=10, r=10, t=50, b=10),
    )
    return fig


def fig_evolucao_horas(serie):
    if serie.empty:
        return _figura_vazia()
    x = serie["data"]
    fig = go.Figure()
    fig.add_bar(
        x=x,
        y=serie["horas"],
        name="Horas por dia",
        marker_color=AZUL_300,
        hovertemplate="%{x}<br>Horas: %{y:.1f} h<extra></extra>",
    )
    fig.add_scatter(
        x=x,
        y=serie["horas_acum"],
        name="Acumulado",
        yaxis="y2",
        mode="lines+markers",
        line=dict(color=AZUL_800, width=2.5),
        marker=dict(size=6),
        hovertemplate="%{x}<br>Acumulado: %{y:.1f} h<extra></extra>",
    )
    fig.update_layout(
        bargap=0.25,
        yaxis=dict(title="Horas por dia"),
        yaxis2=dict(
            title="Horas acumuladas", overlaying="y", side="right", showgrid=False
        ),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
        hovermode="x unified",
        height=360,
        margin=dict(l=10, r=10, t=50, b=10),
    )
    return fig


def fig_por_disciplina(agg, metrica="taxa"):
    if agg.empty:
        return _figura_vazia()
    df = agg.copy()
    df["taxa_acerto"] = df["acertos"] / df["feitas"]
    df["acertos_sem_chute"] = df["acertos"] - df["chutes_certos"]
    df["taxa_segura"] = df["acertos_sem_chute"] / df["feitas"]
    usar_segura = metrica == "taxa_segura"
    coluna = "taxa_segura" if usar_segura else "taxa_acerto"
    titulo = "Taxa sem chute" if usar_segura else "Taxa de acerto"
    num = "acertos_sem_chute" if usar_segura else "acertos"
    df = df.sort_values(coluna, ascending=True)
    fig = go.Figure()
    rotulo_contagem = "Sem chute/Feitas" if usar_segura else "Acertos/Feitas"
    hover = f"%{{y}}<br>{titulo}: %{{x:.1%}}<br>{rotulo_contagem}: %{{customdata[0]}}/%{{customdata[1]}}<extra></extra>"
    for sub, nome, cor in (
        (df[df["bloco"] == "basico"], "Básicos", AZUL_500),
        (df[df["bloco"] == "especifico"], "Específicos", AZUL_800),
    ):
        if sub.empty:
            continue
        fig.add_bar(
            x=sub[coluna],
            y=sub["nome"],
            orientation="h",
            name=nome,
            marker_color=cor,
            customdata=[[a, f] for a, f in zip(sub[num], sub["feitas"])],
            text=[
                f"{t:.1%}  ({a}/{f})"
                for t, a, f in zip(sub[coluna], sub[num], sub["feitas"])
            ],
            textposition="outside",
            cliponaxis=False,
            hovertemplate=hover,
        )
    fig.add_vline(x=0.5, line_color=NEUTRO, line_dash="dot")
    fig.update_layout(
        xaxis=dict(title=titulo, tickformat=".0%", range=[0, 1]),
        yaxis=dict(title=None),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
        height=max(320, 44 * len(df)),
        margin=dict(l=10, r=30, t=50, b=10),
    )
    return fig


def fig_ciclo(ciclo):
    """Círculo do ciclo de estudos: cada disciplina é um setor proporcional às horas.

    ciclo: lista de dicts {id, nome, bloco, horas} na ordem do ciclo.
    """
    if not ciclo:
        return _figura_vazia("Sem disciplinas no ciclo para exibir.")
    labels = [c["nome"] for c in ciclo]
    values = [c["horas"] for c in ciclo]
    blocos = ["Básicos" if c["bloco"] == "basico" else "Específicos" for c in ciclo]
    total = sum(values)
    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=values,
            hole=0.55,
            sort=False,
            direction="clockwise",
            rotation=90,
            customdata=blocos,
            textinfo="label+percent",
            textposition="auto",
            textfont=dict(size=11),
            hovertemplate="%{label} (%{customdata})<br>%{value:.1f} h · %{percent}<extra></extra>",
        )
    )
    fig.update_layout(
        showlegend=False,
        annotations=[
            dict(
                text=f"<b>{total:.0f} h</b><br>por ciclo",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(size=15),
            )
        ],
        height=460,
        margin=dict(l=10, r=10, t=30, b=10),
    )
    return fig


def fig_comparacao(por_disciplina):
    if por_disciplina.empty:
        return _figura_vazia("Sem movimentação entre A e B para exibir.")
    df = por_disciplina.copy().sort_values("delta_pp")
    cores = [AZUL_600 if d >= 0 else NEUTRO for d in df["delta_pp"]]
    fig = go.Figure()
    fig.add_bar(
        x=df["delta_pp"],
        y=df["nome"],
        orientation="h",
        marker_color=cores,
        text=[f"{v:+.1f} p.p." for v in df["delta_pp"]],
        textposition="outside",
        cliponaxis=False,
        hovertemplate="%{y}<br>Δ taxa de acerto: %{x:+.1f} p.p.<extra></extra>",
    )
    fig.add_vline(x=0, line_color=NEUTRO, line_dash="dot")
    fig.update_layout(
        xaxis=dict(title="Δ taxa de acerto (pontos percentuais)"),
        yaxis=dict(title=None),
        height=max(320, 44 * len(df)),
        margin=dict(l=10, r=30, t=40, b=10),
    )
    return fig