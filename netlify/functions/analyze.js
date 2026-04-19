exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    const { cvText, cvImage, jobLabel } = body;

    const systemPrompt = `Tu es un expert ATS specialise dans le marche FIFO mining Western Australia. Tu analyses des CV de candidats visant des postes FIFO en Australie. Tu connais parfaitement JobAdder, Bullhorn et Workday. Ton analyse est basee sur 4700+ annonces Seek WA reelles. Tu fournis un diagnostic honnete MAIS tu ne donnes JAMAIS les solutions exactes. Tu reponds UNIQUEMENT en JSON valide sans markdown sans backticks.`;

    let content;

    if (cvImage && cvImage.data) {
      const mediaType = cvImage.mediaType || 'image/jpeg';
      const validImage = ['image/jpeg','image/png','image/gif','image/webp'].includes(mediaType);

      if (validImage) {
        content = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: cvImage.data
            }
          },
          {
            type: 'text',
            text: `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. Evalue sur 3 criteres : 1. FORMAT PARSEABILITY sur 40pts : colonnes multiples tableaux elements graphiques icones couleurs mise en page complexe. 2. KEYWORD DENSITY sur 40pts : keywords critiques pour ${jobLabel} mining WA vocabulaire terrain australien codes tickets officiels. 3. SECTION COMPLETENESS sur 20pts : sections obligatoires tickets avec codes experience pertinente. Reponds avec exactement ce JSON : {"scores":{"format":12,"keywords":8,"completeness":10,"total":30},"issues":[{"title":"Titre du probleme","desc":"Description en 2 phrases sans solution.","severity":"critical","tag":"CRITIQUE"}],"verdict":"Phrase choc 6-10 mots","improvement_areas":["angle 1","angle 2","angle 3"]} Identifie 4 a 6 issues reelles. CV Canva 2 colonnes = format inferieur a 15. Sois honnete.`
          }
        ];
      } else {
        content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Format non analysable","desc":"Le fichier fourni ne peut pas etre analyse. Soumettre en JPG ou PNG.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en JPG ou PNG","Verifier le format du fichier","Contacter BuildNotBorn pour audit manuel"]}`;
      }
    } else if (cvText) {
      content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU : ${cvText}. Evalue sur 3 criteres : 1. FORMAT PARSEABILITY sur 40pts. 2. KEYWORD DENSITY sur 40pts. 3. SECTION COMPLETENESS sur 20pts. Reponds avec exactement ce JSON : {"scores":{"format":12,"keywords":8,"completeness":10,"total":30},"issues":[{"title":"Titre","desc":"Description.","severity":"critical","tag":"CRITIQUE"}],"verdict":"Phrase choc","improvement_areas":["angle 1","angle 2","angle 3"]}`;
    } else {
      content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA sans CV fourni. Reponds : {"scores":{"format":8,"keywords":6,"completeness":8,"total":22},"issues":[{"title":"Aucun CV detecte","desc":"Le fichier na pas pu etre lu. Merci de reessayer en JPG ou PNG.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV non detecte - reessayer","improvement_areas":["Soumettre en format JPG","Verifier la taille du fichier","Contacter BuildNotBorn"]}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('API error: ' + response.status + ' ' + errText);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('JSON invalide: ' + text.substring(0, 200));
    }

    result.scores.total = Math.min(100,
      (result.scores.format || 0) +
      (result.scores.keywords || 0) +
      (result.scores.completeness || 0)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
