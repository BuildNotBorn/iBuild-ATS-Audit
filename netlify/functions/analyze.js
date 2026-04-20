const mammoth = require('mammoth');

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
    const { cvText, cvImage, cvDocx, jobLabel } = body;

    const systemPrompt = `Tu es un expert ATS specialise dans le marche FIFO mining Western Australia. Tu analyses des CV de candidats visant des postes FIFO en Australie. Tu connais parfaitement JobAdder, Bullhorn et Workday. Ton analyse est basee sur 4700+ annonces Seek WA reelles. Tu fournis un diagnostic honnete MAIS tu ne donnes JAMAIS les solutions exactes. Tu reponds UNIQUEMENT en JSON valide sans markdown sans backticks.`;

    const analysisPrompt = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. Evalue sur 3 criteres : 1. FORMAT PARSEABILITY sur 40pts : colonnes multiples tableaux elements graphiques icones couleurs mise en page complexe. 2. KEYWORD DENSITY sur 40pts : keywords critiques pour ${jobLabel} mining WA vocabulaire terrain australien codes tickets officiels. 3. SECTION COMPLETENESS sur 20pts : sections obligatoires tickets avec codes experience pertinente. Reponds avec exactement ce JSON : {"scores":{"format":12,"keywords":8,"completeness":10,"total":30},"issues":[{"title":"Titre du probleme","desc":"Description en 2 phrases sans solution.","severity":"critical","tag":"CRITIQUE"}],"verdict":"Phrase choc 6-10 mots","improvement_areas":["angle 1","angle 2","angle 3"]} Identifie 4 a 6 issues reelles. CV Canva 2 colonnes = format inferieur a 15. Sois honnete.`;

    let content;
    let betaHeader = null;

    if (cvDocx && cvDocx.data) {
      try {
        const buffer = Buffer.from(cvDocx.data, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        const extractedText = result.value;
        content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU EXTRAIT DU DOCX : ${extractedText}. ${analysisPrompt}`;
      } catch (e) {
        content = `Analyse ce CV pour un poste de ${jobLabel} FIFO WA. Le fichier DOCX n a pas pu etre extrait correctement. Genere une analyse type. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Fichier DOCX non lisible","desc":"Le document soumis ne peut pas etre parse correctement. Soumettre en PDF ou JPG.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en PDF ou JPG","Verifier le format du fichier","Contacter BuildNotBorn"]}`;
      }

    } else if (cvImage && cvImage.data) {
      const mediaType = cvImage.mediaType || 'image/jpeg';
      const isPDF = mediaType === 'application/pdf';
      const validImage = ['image/jpeg','image/png','image/gif','image/webp'].includes(mediaType);

      if (isPDF) {
        betaHeader = 'pdfs-2024-09-25';
        content = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: cvImage.data
            }
          },
          { type: 'text', text: analysisPrompt }
        ];
      } else if (validImage) {
        content = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: cvImage.data
            }
          },
          { type: 'text', text: analysisPrompt }
        ];
      } else {
        content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA. Reponds : {"scores":{"format":10,"keywords":8,"completeness":10,"total":28},"issues":[{"title":"Format non analysable","desc":"Le fichier fourni ne peut pas etre analyse. Soumettre en JPG, PNG ou PDF.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV necessite un audit manuel","improvement_areas":["Soumettre en JPG PNG ou PDF","Verifier le format du fichier","Contacter BuildNotBorn pour audit manuel"]}`;
      }

    } else if (cvText) {
      content = `Analyse ce CV pour un poste de ${jobLabel} en FIFO Western Australia. CONTENU : ${cvText}. ${analysisPrompt}`;

    } else {
      content = `Genere une analyse ATS type pour un poste de ${jobLabel} FIFO WA sans CV fourni. Reponds : {"scores":{"format":8,"keywords":6,"completeness":8,"total":22},"issues":[{"title":"Aucun CV detecte","desc":"Le fichier na pas pu etre lu. Merci de reessayer en JPG, PNG ou PDF.","severity":"critical","tag":"CRITIQUE"}],"verdict":"CV non detecte - reessayer","improvement_areas":["Soumettre en format JPG ou PDF","Verifier la taille du fichier","Contacter BuildNotBorn"]}`;
    }

    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };

    if (betaHeader) {
      requestHeaders['anthropic-beta'] = betaHeader;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: requestHeaders,
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
