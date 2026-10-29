const http = require("node:http");

const page = `<!doctype html><html><head><title>Camoufox node fixture</title></head><body>
<h1>Browser node test</h1><form action="/account" method="get">
<label>Name <input id="name" name="name"></label>
<label>Test password <input id="password" type="password"></label>
<label>Colour <select id="colour"><option value="red">Red</option><option value="green">Green</option></select></label>
<button id="save" type="submit">Save session</button></form>
<a id="next" href="/next">Next page</a><img alt="Test pixel" src="/pixel.svg">
<p id="selection"></p><div style="height:2000px">Scroll fixture</div>
<script>
document.querySelector('form').addEventListener('submit', () => { document.cookie='signed-in=yes; path=/'; localStorage.setItem('signed-in', 'yes'); });
document.querySelector('#colour').addEventListener('change', event => { document.querySelector('#selection').textContent='Selected '+event.target.value; });
</script></body></html>`;

http
  .createServer((request, response) => {
    const url = new URL(request.url, "http://fixture:8080");
    if (url.pathname === "/pixel.svg") {
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>',
      );
      return;
    }
    response.writeHead(url.pathname === "/missing" ? 404 : 200, {
      "content-type": "text/html",
    });
    if (url.pathname === "/account") {
      const signedIn = request.headers.cookie?.includes("signed-in=yes");
      response.end(
        `<h1>${signedIn ? "Signed in" : "Signed out"}</h1><p>Welcome ${url.searchParams.get("name") === "Node tester" ? "Node tester" : "visitor"}</p><a href="/">Home</a>`,
      );
      return;
    }
    if (url.pathname === "/next") {
      response.end('<h1>Next page</h1><a href="/">Home</a>');
      return;
    }
    response.end(page);
  })
  .listen(8080, "0.0.0.0");
