const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/registrar", "/disciplinas", "/horas", "/revisoes", "/ciclo", "/materias", "/api/health"];
const results = [];
for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`);
  results.push({ route, status: response.status });
  if (response.status >= 500) process.exitCode = 1;
}
console.log(JSON.stringify({ baseUrl, results }, null, 2));
