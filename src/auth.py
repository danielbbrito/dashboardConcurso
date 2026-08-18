import streamlit as st


def verificar_acesso():
    if not st.user.is_logged_in:
        st.title("Acesso restrito")
        st.write("Este painel é privado. Entre com sua conta Google para continuar.")
        st.button("Entrar com Google", on_click=st.login)
        st.stop()

    email = getattr(st.user, "email", None)
    if not email:
        st.error("Não foi possível identificar o e-mail da sua conta.")
        st.button("Sair", on_click=st.logout)
        st.stop()

    permitidos = st.secrets.get("authz", {}).get("allowed_emails", [])
    if email not in permitidos:
        st.title("Acesso negado")
        st.write(f"A conta **{email}** não está autorizada a acessar este painel.")
        st.button("Sair", on_click=st.logout)
        st.stop()

    with st.sidebar:
        st.markdown("---")
        st.caption(f":material/account_circle: {email}")
        st.button(":material/logout: Sair", on_click=st.logout)