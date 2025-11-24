import React from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Phone, Youtube } from 'lucide-react';

const AboutPage = () => {
  const { lang } = useParams();
  const currentLanguage = lang || 'ru';

  const content = {
    ru: {
      title: "Центр интегрированного развития",
      description: [
        "Дос Мундос это пространство где объединяются люди желающих внутренних трансформаций с целью обретения целостности и ясности на пути. Место где обмениваются знаниями об правильном и гармоничном использовании традиционных методов лечения, в том числе использование медицинских растений, с целью исцеления тела и ума для соединения с душой.",
        "В центре используют разные методы исцеления, такие как энергетическая коррекция, прием аяуваски и других лекарственных растений, рефлексотерапия, акупрессурная терапия, медитации и другие методы управления энергией.",
        "Для каждого приходит свой набор инструментов, растений. Основой исцеления от наших предков остается растение Аяуваска. Она помогает очистить тело от присутствия чужеродных и паразитических элементов, тем самым решить корень самой болезни, а не симптомы.",
        "Другой базовый метод это энергетическая коррекция, как диагностика, отстаивание и гармонизация энергетической системы человека. Таким образом образуется синергетический метод. С помощью этих методов происходит переподключение со своей внутренней памятью и своей истинной сутью, обретением целостности и, следовательно, гармонизацией окружающей среды и поддержке жизней других."
      ],
      biography: {
        title: "БИОГРАФИЯ ЦЕЛИТЕЛЯ ПЕПЕ ОРДОНЕС",
        text: [
          "Пепе родился в районе Теньенте Сезар Лопес, провинция Альто-Амазонас, регион Лорето - Перу. Его рождение в этом мире было чем-то неожиданным, поскольку он стал девятым ребенком после семи лет разницы со своим предшественником.",
          "С самого раннего возраста он чувствовал связь со своим духовным даром в целитестве. В 10 лет этот дар начал проявляться с лечением матери. Затем спонтанно и чудесным образом увидел что может лечить животных, тем самым пришло его определение - помогать и служить другим.",
          "Дар Пепе все больше начал расскрываться в церемониях Аяуаски, когда ему было 12 лет, участвуя в разных сообшествах сельвы. Тогда же он посвятил себя театру и обучался сначала как актер, а затем как режиссер, что помогло ему в развитии харизмы. Участие в театре помогло ему научиться как управлять энергией.",
          "Пепе был социальным лидером, всегда поддерживал деятельность, основанную на справедливых целях во благо населения, особенно в сфере образования. В своем труде он был предложен как «Человек года». Активная культурная и общественная деятелельность привела к должности директора Национального института культуры города Юримагуас.",
          "Некоторое время спустя он почувствовал призыв к служению, и полностью изменил свою жизнь, посвятив себя целитеству в Перу и за рубежом. Так появился центр интегрального развития «Два мира», занимающийся исцелением тела и ума, для обретения гармонии с душой."
        ]
      },
      method: {
        title: "ЭНЕРГЕТИЧЕСКАЯ КОРЕКЦИЯ",
        text: [
          "Энергетическая коррекция - основной метод, применяемый в центре «Два мира», холистической терапии, которая рассматривает человека как единое целое, гармонии разума, тела и души. В её основе лежит соединение с нашей истинной Сутью.",
          "Терапия пришла как часть основной миссии целителя Пепе Ордоньеса через его дар, проявленный с детства.",
          "Она состоит из индивидуального сеанса, во время которого происходит разблокировка и востановление поврежденых энергетических центров человека. Сама регенерация энергетического тела составляет основу для самоисцеления."
        ]
      },
      mission: {
        title: "МИССИЯ",
        text: [
          "Возраждать и распространять знания предков в чистом и неискаженном виде, и адаптировать их к нынешнему поколению.",
          "Содействовать вселенской гармонии, исцеляя себя и находясь в контакте с природой."
        ]
      },
      vision: {
        title: "ВЗГЛЯДЫ",
        text: [
          "Объединение двух Миров: Неба и Земли.",
          "Человек и его существование проявляются не только в физическом, но и в духовном пространстве.",
          "Объединяя духовное и физическое, открывает возможность прийти к целостности и гармонии. Что даст идеальные условия для сосуществование между различными мирами, населяющими планету Земля, такими как мир животных, растений, людей и других физических и духовных пространств.",
          "Таким образом, в повседневной жизни мы увидим проявление новой парадигмы ненасильственных отношений и взаимодействий между разными мирами.",
          "Все изменяния в микро масштабе, отражаются в макро масштабе."
        ]
      },
      contacts: {
        title: "Контакты",
        email: "pepemariadosmundos@gmail.com",
        whatsapp: "+51959144314",
        whatsappName: "Хуан Карлос",
        youtube: "DOSMUNDOSCDI"
      }
    },
    es: {
      title: "Centro de Desarrollo Integral",
      description: [
        "Un espacio donde congrega a personas con voluntad de cambios y en búsqueda de transformación interna basada en el camino del desarrollo espiritual, intercambios de conocimientos, actividades culturales y de conservación y preservación del medio ambiente.",
        "Compartiendo información del uso adecuado y armonioso de las plantas y métodos de tratamientos ancestrales con el propósito de la sanación del cuerpo y mente para la reconciliación con el alma (sanción del cuerpo mente y alma). Al reconciliarse con todo los traumas emocionales, problemas, bloqueos se da el Milagro de la Sanación del cuerpo y mente.",
        "Se da el uso de métodos variados como alineamiento energético, toma de ayahuasca y otras plantas medicinales, reflexología, digito-terapia, imposición de las manos, meditaciones, hirudoterapia y otros métodos de manejo de energía.",
        "En los métodos de sanación se combinan y se complementan todos; sin embargo, la base de sanación durante muchos años ha sido y sigue siendo el método ancestral de purificación con Ayahuasca siendo la herramienta central para purificar al ser humano eliminando posible presencia de las energías negativas y sacando la enfermedad desde su raíz.",
        "A la par con lo mencionado; el otro método básico que se usa es el alineamiento energético: que se da para diagnosticar, alinear, reorganizar y armonizar el sistema físico-energético. El previo diagnóstico y alineamiento energético antes de la ceremonia de ayahuasca crea condiciones para facilitar los procesos en la toma. Para que se pueda dar beneficios de sanación transformativos interno y efectos curativos.",
        "Formando así un método peculiar sinergetico. Mediante estos métodos se logra la transformación consciente de los pacientes y visitantes; ayudando a reencontrarse y reconectarse con su memoria interna y su verdadera esencia para llegar a la plenitud y por consiguiente inspirando y armonizando su entorno. Aportando positivamente con su nueva vibración el soporte a la vida de los demás."
      ],
      biography: {
        title: "BIOGRAFIA DE PEPE ORDOÑEZ EL SANADOR",
        text: [
          "Nació en el distrito de Teniente Cesar López, Provincia Alto Amazonas, Región Loreto – Perú. Su llegada a este mundo fue algo inesperado siendo el noveno hijo después de siete años de diferencia con su antecesor.",
          "Desde muy pequeño sintió conexión con su don espiritual al servicio de la sanación. A la edad de 10 años este don se manifestó con la curación a su mamá. A esta edad también empezó a sanar y curar animales de forma espontánea y milagrosa. Con estas experiencias define su misión en la vida, de sanar, ayudar y estar al servicio de los demás.",
          "Posteriormente iba manifestando su don en tomas de Ayahuasca en diversos lugares de la región Loreto con tan solo 12 años de edad; posteriormente, vivenciando en distintas comunidades y siendo partícipe en diversos procesos de tomas.",
          "Paralelamente se dedicó al Teatro y se formó primero como actor y después como director, esto le ayudó en el desarrollo de su personalidad carismática. Encontró en el teatro también una forma de manejar la energía y canalizarla.",
          "Fue líder social apoyando siempre en las actividades basadas en las causas justas en beneficio de la población sobre todo en el ámbito educacional, sus acciones y su presencia hicieron que fue propuesto como “Hombre de Año”. Fue activista cultural y social asumiendo el cargo de Director del Instituto Nacional de Cultura de la ciudad de Yurimaguas.",
          "Tiempo después sintió el llamado al servicio, dando su vida un giro completo, pasando así a realizar sanaciones de manera continua en el Perú y el extranjero. Ahora su vida está completamente y en todo momento dedicada al servicio y así se origina el Centro de Desarrollo Integral “Dos Mundos” sanación del cuerpo y mente para la armonización con el alma."
        ]
      },
      method: {
        title: "EL ALIENEAMENTO ENERGETICO",
        text: [
          "El alineamiento energético es el método básico que se aplica en el CDI “Dos Mundos”, una terapia holística que entiende al individuo como un Todo (mente-cuerpo-alma) y que propone alinear nuestra vida con la parte más pura de nuestro Ser, nuestra verdadera Esencia.",
          "Se trata de una novedosa y profunda terapia de la fuente Divina que llegó como parte de la misión principal del Sanador Pepe Ordoñez, a través del don manifestado desde su niñez.",
          "Eso consiste en una sesión individual durante la cual mediante el manejo de energía y a otras prácticas terapéutica incorporadas durante el tratamiento se logra desbloquear los diferentes centros energéticos del ser humano, que han sido afectados debido a diferentes influencias del entorno social y/o familiar produciendo así una regeneración de todo el cuerpo energético que en si ya forma base para la auto-sanación."
        ]
      },
      mission: {
        title: "LA MISSIÓN",
        text: [
          "Transferir y devolver el conocimiento de los ancestros en su forma Pura e intacta, así como ellos nos transmitieron adaptada a la generación actual.",
          "Canalizar todas las manifestaciones energéticas a la dimensión correspondiente mediante distintos métodos de sanación ligados a la Luz y a la Divinidad.",
          "Promover la armonía con el Universo mediante la sanación de uno mismo y el estar en contacto con la naturaleza."
        ]
      },
      vision: {
        title: "LA VISIÓN",
        text: [
          "Unir dos Mundos: el Cielo y la Tierra.",
          "El Hombre y su Existencia se manifiestan no solamente en lo físico sino también en el espacio Espiritual.",
          "Al unir los dos al máximo del potencial del Ser, se da la oportunidad de llegar a la Plenitud y vivir en un planeta donde los dos mundos están entrelazados en armonía.",
          "Entonces llegando a esta se logra una convivencia perfecta entre los mundos diferentes que habitan el planeta Tierra, como el mundo de animales, de plantas, de humanos y de otros espacios físicos y espirituales.",
          "Así en lo cotidiano veremos el manifestar de un nuevo paradigma de relaciones e interacciones no violentas entre diferentes mundos.",
          "A efectos de cambio en el Microcosmos se manifiestan los mismos cambios en el Macrocosmos."
        ]
      },
      contacts: {
        title: "Contactos",
        email: "pepemariadosmundos@gmail.com",
        whatsapp: "+51959144314",
        whatsappName: "Juan Carlos",
        youtube: "DOSMUNDOSCDI"
      }
    }
  };

  // Fallback to English or Russian if language not found, but for now default to RU if not ES
  const data = content[currentLanguage] || content['ru'];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Main Title */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-6">
          {data.title}
        </h1>
        <div className="prose prose-lg prose-invert mx-auto text-slate-300">
          {data.description.map((paragraph, idx) => (
            <p key={idx} className="mb-4 leading-relaxed text-justify">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Biography Section */}
      <section className="mb-16 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-white mb-6 border-b border-slate-700 pb-4">
          {data.biography.title}
        </h2>
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 prose prose-invert text-slate-300">
            {data.biography.text.map((paragraph, idx) => (
              <p key={idx} className="mb-4 leading-relaxed text-justify">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="w-full md:w-1/3 shrink-0">
            <img 
              src="https://static.wixstatic.com/media/nsplsh_696108e5cea1451b8b748e9fe11dd109~mv2.jpg/v1/fill/w_400,h_300,al_c,q_80,usm_0.66_1.00_0.01,blur_2,enc_avif,quality_auto/Pepe.jpg" 
              alt="Pepe Ordoñez" 
              className="w-full rounded-xl shadow-lg object-cover aspect-[3/4]"
            />
          </div>
        </div>
      </section>

      {/* Method Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
          {data.method.title}
        </h2>
        <div className="flex flex-col md:flex-row-reverse gap-8 items-start">
          <div className="flex-1 prose prose-invert text-slate-300">
            {data.method.text.map((paragraph, idx) => (
              <p key={idx} className="mb-4 leading-relaxed text-justify">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="w-full md:w-1/3 shrink-0">
            <img 
              src="https://static.wixstatic.com/media/7e97c8_cb6447e02ace46678cd805f0102a165e~mv2.jpg/v1/fill/w_400,h_500,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Energy.jpg" 
              alt="Energy Correction" 
              className="w-full rounded-xl shadow-lg object-cover"
            />
          </div>
        </div>
      </section>

      {/* Mission & Vision Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <section className="bg-slate-900/30 p-8 rounded-2xl border border-slate-800">
          <h2 className="text-2xl font-bold text-purple-400 mb-4">
            {data.mission.title}
          </h2>
          <div className="prose prose-invert text-slate-300">
            {data.mission.text.map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="bg-slate-900/30 p-8 rounded-2xl border border-slate-800">
          <h2 className="text-2xl font-bold text-pink-400 mb-4">
            {data.vision.title}
          </h2>
          <div className="prose prose-invert text-slate-300">
            {data.vision.text.map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </div>

      {/* Contacts Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700 text-center">
        <h2 className="text-3xl font-bold text-white mb-8">
          {data.contacts.title}
        </h2>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          <a 
            href={`mailto:${data.contacts.email}`}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="p-4 bg-blue-500/20 rounded-full text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Mail className="w-8 h-8" />
            </div>
            <span className="text-slate-300 group-hover:text-white transition-colors">
              {data.contacts.email}
            </span>
          </a>

          <a 
            href={`https://wa.me/${data.contacts.whatsapp.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 group"
          >
            <div className="p-4 bg-green-500/20 rounded-full text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all">
              <Phone className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-slate-300 group-hover:text-white transition-colors font-medium">
                {data.contacts.whatsapp}
              </span>
              <span className="text-sm text-slate-500 group-hover:text-slate-300">
                {data.contacts.whatsappName}
              </span>
            </div>
          </a>

          <a 
            href={`https://youtube.com/${data.contacts.youtube}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 group"
          >
            <div className="p-4 bg-red-500/20 rounded-full text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all">
              <Youtube className="w-8 h-8" />
            </div>
            <span className="text-slate-300 group-hover:text-white transition-colors">
              YouTube
            </span>
          </a>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
