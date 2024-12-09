const express = require('express');
const neo4j = require('neo4j-driver');
const bodyParser = require('body-parser');
const app = express();

const driver = neo4j.driver(
  'neo4j+s://7838d495.databases.neo4j.io',
  neo4j.auth.basic('neo4j', 'uSFOATmuUm7CIDoQSLN5R3upmkqge1nqQ-A6fZ1Jb_k')
);

const session = driver.session();

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.redirect('/rekomendacje');
  });

async function fetchGraphData() {
  try {
    const result = await session.run(`
      MATCH (a)-[r]->(b)
      RETURN 
        a.id AS fromId, 
        a.imie AS fromLabel,
        b.id AS toId, 
        CASE
            WHEN b:Osoba THEN b.imie
            ELSE b.nazwa
        END AS toLabel,
        type(r) AS relationType,
        properties(r) AS relationProps
    `);

    const graphData = result.records.map(record => ({
      from: {
        id: record.get('fromId'),
        label: record.get('fromLabel'),
      },
      to: {
        id: record.get('toId'),
        label: record.get('toLabel'),
      },
      relation: {
        type: record.get('relationType'),
        props: record.get('relationProps'),
      },
    }));

    return graphData;
  } catch (err) {
    console.error('Błąd podczas pobierania danych:', err);
    throw err;
  }
}

app.get('/rekomendacje', async (req, res) => {
  try {
    const graphData = await fetchGraphData();
    // console.log('Graph Data:', graphData);
    res.render('index', { graphData: graphData });
  } catch (err) {
    res.status(500).send('Błąd pobierania danych z Neo4j');
  }
});
app.get('/add-link', (req, res) => {
    res.render('add-link'); 
  });
  
app.get('/add-person', (req, res) => {
  res.render('add-person');
});

app.post('/add-person', async (req, res) => {
    const name = req.body.name;
    const query = `
      CREATE (p:Osoba {imie: $name})
      RETURN p
    `;
  
    try {
      const result = await session.run(query, { name });
      console.log('Osoba została dodana: ', result.records[0].get('p'));
      res.redirect('/rekomendacje');
    } catch (error) {
      console.error(error);
      res.status(500).send('Błąd podczas dodawania osoby');
    }
  });

  app.get('/add-object', (req, res) => {
    res.render('add-object');
  });
  

  app.post('/add-object', async (req, res) => {
      const name = req.body.name;
      const query = `
        CREATE (p:ObiektRekomendowany {nazwa: $name})
        RETURN p
      `;
    
      try {
        const result = await session.run(query, { name });
        console.log('Obiekt został dodany: ', result.records[0].get('p'));
        res.redirect('/rekomendacje');
      } catch (error) {
        console.error(error);
        res.status(500).send('Błąd podczas dodawania obiektu');
      }
    });
  
app.post('/add-link', async (req, res) => {
    const personId = req.body.from;
    const objectId = req.body.to;
    const relationType = req.body.relation; 
    console.log(personId);
    console.log(objectId);
    console.log(relationType);
  
    const query = `
      MATCH (p:Osoba {id: $personId}), (o:ObiektRekomendowany {id: $objectId})
      CREATE (p)-[r:${relationType}]->(o)
      RETURN p, r, o
    `;
  
    try {
      const result = await session.run(query, { personId, objectId });
      console.log('Powiązanie utworzone: ', result.records);
      res.redirect('/rekomendacje');  
    } catch (error) {
      console.error(error);
      res.status(500).send('Błąd podczas tworzenia powiązania');
    }
  });

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
