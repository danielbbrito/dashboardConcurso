import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container py-5">
      <h1 className="h3">Pagina nao encontrada</h1>
      <p className="text-secondary">O endereco informado nao corresponde a uma area disponivel.</p>
      <Link className="btn btn-primary" href="/">Voltar para a visao geral</Link>
    </main>
  );
}
