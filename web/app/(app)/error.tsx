"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section aria-labelledby="error-title" className="alert alert-danger" role="alert">
      <h1 className="h5" id="error-title">Nao foi possivel carregar esta area</h1>
      <p>Tente novamente. Se o problema continuar, informe o horario do erro ao responsavel pelo sistema.</p>
      <button className="btn btn-outline-danger" onClick={() => reset()} type="button">Tentar novamente</button>
    </section>
  );
}
