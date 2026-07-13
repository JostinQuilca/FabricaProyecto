const fetch = require('node-fetch'); // wait, node 24 has fetch built-in, no need for require if we use global fetch or node's fetch.

async function run() {
  const query = `
    mutation {
      login(email: "jdquilcap1@utn.edu.ec", password: "2004Jd20") {
        token
        usuario {
          id
          nombre
          email
          rol { nombre }
          createdAt
        }
      }
    }
  `;
  
  try {
    const res = await fetch('http://localhost:4000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();
