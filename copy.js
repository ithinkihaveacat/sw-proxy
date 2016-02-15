function newRequest(res, init) {
  return new Response(blob, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers()
  });
}
