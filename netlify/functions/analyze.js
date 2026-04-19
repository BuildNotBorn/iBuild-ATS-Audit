exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { cvText, cvImage, job, jobLabel } = JSON.parse(event.body);

    const systemPrompt = `Tu es un expert ATS spécialisé dans le marché FIFO mining Western Australia. Tu analyses des CV de candidats francophones visant des postes FIFO en Australie. Tu connais parfaitement les systèmes JobAdder, Bullhorn et Workday utilisés par les recruteurs WA. Ton analyse est basée sur un corpus de 4 700+ annonces Seek WA réelles. RÈGLE ABSOLUE : Tu fournis un diagnostic honnête et précis MAIS tu ne donnes JAMAIS les solutions exactes. Tu identifies les problèmes, tu donnes les angles d'amélioration, mais pas la recette complète. La recette complète est le service payant de BuildNotBorn / The Site Access. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.`;

    const userPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. ${cvText ? 'CONTENU DU CV:\n' + cvText : 'CV fourni en image ci-dessus.'} Évalue sur ces 3 critères ATS réels : 1. FORMAT PARSEABILITY (sur 40 pts) : présence de tableaux, colonnes multiples, zones de texte, coordonnées en texte brut, titres de sections standards, éléments graphiques. 2. KEYWORD DENSITY (sur 40 pts) : présence des keywords critiques pour ${jobLabel} FIFO WA, vocabulaire terrain australien mining, codes tickets officiels. 3. SECTION COMPLETENESS (sur 20 pts) : sections obligatoires présentes, tickets avec codes, expérience pertinente. Réponds avec ce JSON exact : {"scores":{"format":0,"keywords":0,"completeness":0,"total":0},"issues":[{"title":"titre","desc":"description","severity":"critical","tag":"CRITIQUE"}],"verdict":"phrase choc","improvement_areas":["angle 1","angle 2","angle 3"]} Identifie entre 4 et 6 issues réelles. Un CV Canva 2 colonnes doit avoir format < 15/40.`;

    const messages = [];

    if (cvImage) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: cvImage.mediaType, data: cvImage.data } },
          { type: 'text', text: userPrompt }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userPrompt });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) throw new Error('API error: ' + response.status);

    const data = await response.json();
    const text = data.content[0].text.trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('Invalid JSON from Claude');
    }

    result.scores.total = Math.min(100,
      (result.scores.format || 0) + (result.scores.keywords || 0) + (result.scores.completeness || 0)
    );

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
