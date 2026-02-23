import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const openai = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: 'https://api.deepseek.com',
});

const TARGET_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pl', name: 'Polish' }
];

// Original ES headers from backup (Feb 9, 2026)
const originalESHeaders = {
  "2019-06-26": "Introducción a la filosofía de vida",
  "2020-01-15": "El arte de tomar decisiones",
  "2020-01-22": "Baños de agua fría para niños",
  "2020-01-29": "Función del ser humano en los cambios actuales",
  "2020-02-12": "Introducción y apertura del espacio",
  "2020-02-19": "Tema planeado para el miércoles pasado",
  "2020-02-27": "Pensar en la muerte y el más allá",
  "2020-03-04": "Existencia del diablo y numerología",
  "2020-03-11": "Compensación a pueblos indígenas",
  "2020-03-18": "Concepto de patria y herencia ancestral",
  "2020-03-26": "Nuevas energías y prácticas espirituales",
  "2020-04-01": "Meditación mundial contra el coronavirus",
  "2020-04-08": "Apertura y conexión inicial",
  "2020-04-15": "Plantas que eliminan chips energéticos",
  "2020-04-22": "Entrenamiento externo para el ser humano",
  "2020-04-29": "Movimiento energético y control planetario",
  "2020-05-06": "Consumo de agua ozonizada",
  "2020-05-13": "Restaurar la glándula timo después de una operación",
  "2020-05-20": "Introducción sobre el cambio y la ayuda",
  "2020-05-27": "Dolor de espalda por trabajo físico",
  "2020-06-03": "Aceptación vs. consentimiento en conflictos",
  "2020-06-10": "Introducción y apertura del espacio",
  "2020-06-17": "Parásitos energéticos y su percepción",
  "2020-06-24": "Reglas estrictas en el centro de sanación",
  "2020-07-01": "Ronquidos y cómo solucionarlos",
  "2020-07-08": "¿Somos avatares de otros seres?",
  "2020-07-16": "Si todo lo que vivimos nos corresponde",
  "2020-07-22": "Sobre el traspaso y los próximos 5 años",
  "2020-07-29": "Vicios que regresan después de la meditación",
  "2020-08-05": "Introducción a la sanación integral",
  "2020-08-12": "Desarrollo espiritual con plantas sagradas",
  "2020-08-19": "Sensibilidad olfativa durante la dieta",
  "2020-08-26": "Desarrollar la intuición",
  "2020-09-02": "Introducción y apertura del espacio",
  "2020-09-09": "Introducción y apertura del espacio",
  "2020-09-23": "Concepto de madurez",
  "2020-09-30": "Efectos de la cercanía con consumidores de marihuana",
  "2020-10-07": "Tumor y tratamiento con hongos",
  "2020-10-14": "Introducción y bienvenida al espacio",
  "2020-10-21": "Cómo desapegarse del apego",
  "2020-11-04": "Experiencia personal con ayuno y regeneración",
  "2021-01-06": "Cómo aceptarse a sí mismo",
  "2021-01-20": "Disciplina de la mente. Conocerte a ti mismo",
  "2021-01-27": "Sueños durante una dieta",
  "2021-02-03": "Tiempo de definición",
  "2021-02-10": "Cómo lidiar con las emociones negativas",
  "2021-02-17": "Dependencia de la ceremonia de quién vierte",
  "2021-02-24": "Cómo lidiar con el dolor",
  "2021-03-03": "El transmitir del conocimiento",
  "2021-03-10": "Sanando los Traumas Emocionales",
  "2021-03-17": "Como reconocer los Mensajes sagrados",
  "2021-03-24": "Aceptación, vivir en Libertad.",
  "2021-03-31": "¿Qué es el dolor y cómo tratarlo?",
  "2021-04-07": "Los Chakras y signos zodiacales",
  "2021-04-14": "Diferencia entre respeto y aceptación",
  "2021-04-21": "Pregunta sobre la predestinación y el destino",
  "2021-04-28": "El plan universal. Enfermedades como parte del plan. Libertad de Elección",
  "2021-05-05": "Fuente de curación. La belleza del hombre simple",
  "2021-10-20": "Vacunación. Adicción a las vacunas",
  "2021-10-27": "Saludo inicial y concepto de plenitud",
  "2021-11-03": "Acumulación de grasa en el pecho",
  "2021-11-10": "Efectos de estar cerca de consumidores de marihuana",
  "2021-11-17": "Alternativa a la Ayahuasca en Rusia",
  "2021-11-24": "¿Qué es el ego? Ilusiones de la mente",
  "2021-12-01": "Efectos de estar con consumidores de drogas",
  "2021-12-08": "Comprender la dieta vegetal",
  "2021-12-15": "Almacenamiento de plantas con olor fuerte",
  "2021-12-22": "Sobre chakruna. ¿Es posible el desarrollo espiritual en las ceremonias?",
  "2021-12-29": "Pepe bebió todas las plantas",
  "2022-01-05": "Espacio de intercambio y bienvenida",
  "2022-01-12": "Alimentos de alta y baja vibración",
  "2022-01-26": "Cómo hacer preguntas de ayahuasca correctamente",
  "2022-02-02": "Energías y limpieza en relaciones sexuales",
  "2022-02-09": "Flatulencia",
  "2022-02-16": "Salida del frío del cuerpo durante la dieta",
  "2022-02-23": "Suplementación después de la dieta",
  "2022-03-02": "Los chips",
  "2022-03-09": "Insomnio durante de Dieta",
  "2022-03-16": "Geopolítica. Estrategia destructiva.",
  "2022-03-23": "Pregunta sobre la brujería en Perú",
  "2022-03-30": "Amigos con drogas y fiestas",
  "2022-04-06": "Transformación vibracional de la Tierra",
  "2022-04-13": "Piedra con petroglifos y su energía",
  "2022-04-20": "¿Qué son los sobornos en el desarrollo?",
  "2022-04-27": "Estado energético de las plantas",
  "2022-05-04": "Zumbido al tomar ayahuasca",
  "2022-05-18": "Agua fría por la mañana",
  "2022-05-25": "Pepe en visiones",
  "2022-06-01": "Prueba en los sueños",
  "2022-06-09": "Infertilidad después de endometriosis",
  "2022-06-15": "Mandala para la meditación",
  "2022-06-29": "Ganar dinero y ambiciones",
  "2022-07-06": "Visiones en Ayahuasca. Un producto de la mente y sagrado",
  "2022-07-13": "Introducción y apertura para preguntas",
  "2022-07-20": "Dieta y ayahuasca durante el embarazo",
  "2022-08-10": "Comer a dieta con una planta",
  "2022-08-24": "Cómo influye el chisme energéticamente",
  "2022-08-31": "Petición para bailar de nuevo",
  "2022-09-07": "Adicción",
  "2022-09-14": "Psicología cuántica. Posibilidades de la mente y el espíritu",
  "2022-09-21": "Introducción y bienvenida al espacio",
  "2022-09-28": "Sobre la sal y el azúcar. Nutrición",
  "2022-10-12": "Qué es la pobreza",
  "2022-12-28": "Dieta con Oje",
  "2023-01-04": "Introducción y bienvenida",
  "2023-01-11": "Introducción al espacio de sanación",
  "2023-01-18": "Introducción y bienvenida",
  "2023-01-25": "Introducción y bienvenida",
  "2023-02-01": "Introducción y bienvenida al espacio",
  "2023-02-08": "Guías espirituales",
  "2023-02-15": "Introducción y bienvenida al espacio",
  "2023-02-22": "Conflictos con otras personas",
  "2023-03-01": "Educación de los niños",
  "2023-08-23": "Elección de familia al nacer",
  "2023-08-30": "Introducción y bienvenida",
  "2023-09-13": "Cómo evitar acumular frío en el cuerpo",
  "2023-09-27": "Introducción",
  "2023-10-04": "Introducción",
  "2023-10-11": "Introducción",
  "2024-08-07": "La conexión entre la edad de 33 años y las crisis de vida",
  "2024-08-24": "Límites personales. Cómo protegerlos",
  "2024-08-28": "Introducción. Comentarios sobre el incidente",
  "2024-08-31": "Diferencia entre chip y programa",
  "2024-09-04": "Desbloqueo de chakras",
  "2024-09-11": "Propiedades de la dieta de ayahuasca cruda",
  "2024-09-18": "Ayuno",
  "2024-09-25": "Liberar traumas generacionales de la guerra",
  "2024-10-02": "Sobre el servicio a los demás y a uno mismo",
  "2024-10-09": "Origen de la conciencia humana",
  "2024-10-16": "Tipos de conciencia y amor",
  "2024-10-23": "Grupo de sanadores en el planeta",
  "2024-11-13": "El mejor momento para conectarse con Dios",
  "2025-01-22": "La voz del ego y los mensajes del universo",
  "2025-01-29": "¿Es necesario leer libros? El universo infinito",
  "2025-02-19": "Introducción y tema del día",
  "2025-06-28": "Vómito y purga con plantas medicinales",
  "2025-07-23": "Terapia de contraste frío-calor",
  "2025-10-08": "Ceremonia con San Pedro",
  "2025-10-15": "Ayuda de ancestros y ángeles",
  "2025-10-22": "Bloques energéticos y relaciones",
  "2025-10-29": "Compartir alimentos y energía",
  "2025-11-19": "Ciclo hindú y era de oro",
  "2025-11-26": "Limpiezas energéticas con huevo",
  "2025-12-03": "Dolor al tomar ayahuasca"
};

async function translateText(text, targetLangName) {
  const prompt = `Translate the following Spanish title to ${targetLangName}. 
Return ONLY the translated text without any quotes, markdown or explanations.

Text: ${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a professional translator. Return only the translated text." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      stream: false
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error translating to ${targetLangName}:`, error);
    return null;
  }
}

async function restoreHeaders() {
  console.log('=== Restoring Original Headers from Backup ===\n');
  
  // First, restore ES headers
  console.log('Restoring ES headers...');
  let esRestored = 0;
  
  for (const [slug, originalTitle] of Object.entries(originalESHeaders)) {
    // Get the first timecode for this episode
    const { data: timecodes, error } = await supabase
      .from('timecodes')
      .select('id, title, time')
      .eq('episode_slug', slug)
      .eq('lang', 'es')
      .order('time', { ascending: true })
      .limit(1);
    
    if (error || !timecodes || timecodes.length === 0) {
      console.log(`  No ES timecode found for ${slug}`);
      continue;
    }
    
    const firstTc = timecodes[0];
    
    // Update if different
    if (firstTc.title !== originalTitle) {
      const { error: updateError } = await supabase
        .from('timecodes')
        .update({ title: originalTitle })
        .eq('id', firstTc.id);
      
      if (updateError) {
        console.error(`  Error updating ES ${slug}:`, updateError);
      } else {
        console.log(`  ES ${slug}: "${firstTc.title}" -> "${originalTitle}"`);
        esRestored++;
      }
    }
  }
  
  console.log(`\nES restored: ${esRestored}\n`);
  
  // Now translate to other languages
  for (const lang of TARGET_LANGUAGES) {
    console.log(`\nTranslating to ${lang.name} (${lang.code})...`);
    let langRestored = 0;
    
    for (const [slug, esTitle] of Object.entries(originalESHeaders)) {
      // Get the first timecode for this episode in this language
      const { data: timecodes, error } = await supabase
        .from('timecodes')
        .select('id, title, time')
        .eq('episode_slug', slug)
        .eq('lang', lang.code)
        .order('time', { ascending: true })
        .limit(1);
      
      if (error || !timecodes || timecodes.length === 0) {
        continue;
      }
      
      const firstTc = timecodes[0];
      
      // Check if it's in "Meditation DD.MM.YY" format or needs update
      const meditationPattern = /^Medit[aei]ci[oó]n \d{2}\.\d{2}\.\d{2}$/;
      
      // Always translate from ES for consistency
      {
        // Translate ES title to this language
        const translatedTitle = await translateText(esTitle, lang.name);
        
        if (translatedTitle) {
          const { error: updateError } = await supabase
            .from('timecodes')
            .update({ title: translatedTitle })
            .eq('id', firstTc.id);

          if (updateError) {
            console.error(`  Error updating ${slug} (${lang.code}):`, updateError);
          } else {
            console.log(`  ${slug} (${lang.code}): "${firstTc.title}" -> "${translatedTitle}"`);
            langRestored++;
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    console.log(`  ${lang.name}: Restored ${langRestored}`);
  }

  console.log('\n=== Restoration Complete ===');
}

restoreHeaders().then(() => process.exit(0));
