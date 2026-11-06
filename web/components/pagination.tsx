type PaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query?: string;
};

export function Pagination({ basePath, page, pageSize, total, query = "" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function href(targetPage: number): string {
    const params = new URLSearchParams(query);
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav aria-label="Paginação" className="d-flex align-items-center justify-content-between gap-3 mt-3">
      <span className="small text-secondary">Página {page} de {totalPages}</span>
      <div className="btn-group" role="group">
        <a aria-disabled={page <= 1} className={`btn btn-outline-secondary ${page <= 1 ? "disabled" : ""}`} href={page > 1 ? href(page - 1) : undefined}>Anterior</a>
        <a aria-disabled={page >= totalPages} className={`btn btn-outline-secondary ${page >= totalPages ? "disabled" : ""}`} href={page < totalPages ? href(page + 1) : undefined}>Próxima</a>
      </div>
    </nav>
  );
}
