import plotly.graph_objects as go
import plotly.io as pio

AZUL_800, AZUL_600, AZUL_500, AZUL_300 = "#1E3A8A", "#2563EB", "#3B82F6", "#93C5FD"
TEXTO, TEXTO_SEC, GRID = "#1F2937", "#6B7280", "#E5E7EB"
NEUTRO = "#9CA3AF"
FUNDO_AZUL = "#EFF6FF"


def register_template() -> None:
    t = go.layout.Template(
        layout=go.Layout(
            font=dict(family="sans serif", color=TEXTO, size=13),
            paper_bgcolor="white",
            plot_bgcolor="white",
            colorway=[AZUL_600, AZUL_800, AZUL_500, AZUL_300, "#64748B"],
            xaxis=dict(
                gridcolor=GRID,
                zerolinecolor=GRID,
                linecolor=GRID,
                tickfont=dict(color=TEXTO_SEC),
            ),
            yaxis=dict(
                gridcolor=GRID,
                zerolinecolor=GRID,
                linecolor=GRID,
                tickfont=dict(color=TEXTO_SEC),
            ),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
            margin=dict(l=10, r=10, t=40, b=10),
            hoverlabel=dict(bgcolor="white", font_size=12),
        )
    )
    pio.templates["bcb_azul"] = t
    pio.templates.default = "bcb_azul"


register_template()