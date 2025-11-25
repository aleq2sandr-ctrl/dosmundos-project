import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Users, Home, Fish, Utensils, Sprout } from 'lucide-react';

const content = {
  ru: {
    title: "ПРИГЛАШЕНИЕ ВОЛОНТЁРОВ",
    subtitle: "Исцеление и Служение в Амазонии",
    intro: "Центр Дос Мундос основан на служении. Мы объединяем людей, которые следуют этому пути. Вместо найма профессиональных работников мы приглашаем волонтеров, чтобы каждый приезжающий в Дос Мундос, мог проявить свою искренность, ощутить себя полезным и нужным, а также проявить свою любовь в сообществе.\n\nЕсли вы чувствуете зов к духовному развитию, мы приглашаем вас присоединиться к нашему сообществу, расположенному в Перу, в сердце амазонских джунглей. Это возможность для тех, кто готов к глубокой внутренней трансформации и желает пройти путь исцеления через служение, а также работу с традиционными растениями под руководством целителя Пепе.",
    sections: [
      {
        title: "Что Мы Предлагаем",
        text: "Безопасное пространство для исцеления с Аяуаской и другими традиционными растениями. Органическое питание из продуктов нашей собственной фермы. Здоровую среду и жилье, позволяющую вам отключиться от суеты современного мира, воссоединиться с собой и восстановить связь с природой"
      },
      {
        title: "Кого Мы Ищем",
        text: "Мы ищем волонтеров, которые хотят совместить свой собственный путь исцеления со служением другим. Это не просто ретрит — это глубокий трансформационный опыт, где рост происходит через проявленное служение."
      }
    ],
    waysToServe: {
      title: "Способы Служения",
      items: [
        { icon: Sprout, text: "Уход за фермой и животными: забота о коровах, козах, морских свинках, кроликах, курах и лошадях" },
        { icon: Utensils, text: "Помощь на кухне: приготовление пищи и уборка" },
        { icon: Home, text: "Уход за домом: уборка комнат и ванных комнат, помощь со стиркой" },
        { icon: Users, text: "Работа в молочном цехе: приготовление масла, творога и сыра" },
        { icon: Fish, text: "Рыбалка: помощь с ловлей рыбы сетями (особенно приветствуется участие мужчин, комфортно чувствующих себя с этой работой)" },
        { icon: Heart, text: "Поддержка сообщества: различные задачи, способствующие процветанию и развитию нашего сообщества" }
      ]
    },
    philosophy: {
      title: "Философия Центра",
      text: "Мы верим, что истинное исцеление приходит как через глубокую внутреннюю работу, так и через служение. Каждый день в Дос Мундос — это возможность трансформации через практику, связь с природой и сердечное служение."
    },
    closing: {
      title: "Присоединяйтесь к Нам",
      text: "Если вы чувствуете призыв пройти этот путь исцеления и служения вместе с нами, мы ждём вас. Напишите о себе, вашем опыте и желаемом времени пребывания"
    }
  },
  en: {
    title: "VOLUNTEER INVITATION",
    subtitle: "Healing and Service in the Amazon",
    intro: "Dos Mundos Center is founded on service. We bring together people who follow this path. Instead of hiring professional workers, we invite volunteers so that everyone who comes to Dos Mundos can express their sincerity, feel useful and needed, and manifest their love within the community.\n\nIf you feel a call to spiritual development, we invite you to join our community located in Peru, in the heart of the Amazon jungle. This is an opportunity for those ready for deep inner transformation and wishing to walk the path of healing through service, as well as work with traditional plants under the guidance of healer Pepe.",
    sections: [
      {
        title: "What We Offer",
        text: "A safe space for healing with Ayahuasca and other traditional plants. Organic food from our own farm. A healthy environment and accommodation allowing you to disconnect from the bustle of the modern world, reconnect with yourself, and restore your connection with nature."
      },
      {
        title: "Who We Are Looking For",
        text: "We are looking for volunteers who want to combine their own healing journey with service to others. This is not just a retreat — it is a deep transformational experience where growth happens through manifested service."
      }
    ],
    waysToServe: {
      title: "Ways to Serve",
      items: [
        { icon: Sprout, text: "Farm and animal care: caring for cows, goats, guinea pigs, rabbits, chickens, and horses" },
        { icon: Utensils, text: "Kitchen help: food preparation and cleaning" },
        { icon: Home, text: "Housekeeping: cleaning rooms and bathrooms, helping with laundry" },
        { icon: Users, text: "Dairy work: making butter, cottage cheese, and cheese" },
        { icon: Fish, text: "Fishing: helping with net fishing (participation of men comfortable with this work is especially welcome)" },
        { icon: Heart, text: "Community support: various tasks contributing to the prosperity and development of our community" }
      ]
    },
    philosophy: {
      title: "Center Philosophy",
      text: "We believe that true healing comes both through deep inner work and through service. Every day at Dos Mundos is an opportunity for transformation through practice, connection with nature, and heartfelt service."
    },
    closing: {
      title: "Join Us",
      text: "If you feel the call to walk this path of healing and service with us, we are waiting for you. Write to us about yourself, your experience, and your desired length of stay."
    }
  },
  es: {
    title: "LLAMADO A VOLUNTARIOS",
    subtitle: "Sanación y Servicio en la Amazonía",
    intro: "El Centro Dos Mundos se basa en el servicio. Unimos a personas que siguen este camino. En lugar de contratar trabajadores profesionales, invitamos a voluntarios para que cada persona que llegue a Dos Mundos pueda expresar su sinceridad, sentirse útil y necesaria, y manifestar su amor en la comunidad.\n\nSi sientes un llamado al desarrollo espiritual, te invitamos a unirte a nuestra comunidad ubicada en Perú, en el corazón de la selva amazónica. Esta es una oportunidad para aquellos listos para una profunda transformación interior y que desean recorrer el camino de sanación a través del servicio, así como el trabajo con plantas tradicionales bajo la guía del curandero Pepe.",
    sections: [
      {
        title: "Lo Que Ofrecemos",
        text: "Un espacio seguro para la sanación con Ayahuasca y otras plantas tradicionales. Alimentación orgánica con productos de nuestra propia granja. Un entorno saludable y alojamiento que te permite desconectarte del ajetreo del mundo moderno, reconectarte contigo mismo y restaurar tu conexión con la naturaleza."
      },
      {
        title: "A Quién Buscamos",
        text: "Buscamos voluntarios que quieran combinar su propio camino de sanación con el servicio a los demás. Esto no es solo un retiro, es una experiencia de transformación profunda donde el crecimiento ocurre a través del servicio manifiesto."
      }
    ],
    waysToServe: {
      title: "Formas de Servir",
      items: [
        { icon: Sprout, text: "Cuidado de la granja y animales: cuidado de vacas, cabras, cuyes, conejos, gallinas y caballos" },
        { icon: Utensils, text: "Ayuda en la cocina: preparación de alimentos y limpieza" },
        { icon: Home, text: "Cuidado del hogar: limpieza de habitaciones y baños, ayuda con la lavandería" },
        { icon: Users, text: "Trabajo en la lechería: elaboración de mantequilla, requesón y queso" },
        { icon: Fish, text: "Pesca: ayuda con la pesca con redes (se agradece especialmente la participación de hombres que se sientan cómodos con este trabajo)" },
        { icon: Heart, text: "Apoyo a la comunidad: diversas tareas que contribuyen a la prosperidad y desarrollo de nuestra comunidad" }
      ]
    },
    philosophy: {
      title: "Filosofía del Centro",
      text: "Creemos que la verdadera sanación llega tanto a través del trabajo interior profundo como a través del servicio. Cada día en Dos Mundos es una oportunidad de transformación a través de la práctica, la conexión con la naturaleza y el servicio de corazón."
    },
    closing: {
      title: "Únete a Nosotros",
      text: "Si sientes el llamado a recorrer este camino de sanación y servicio con nosotros, te esperamos. Escríbenos sobre ti, tu experiencia y el tiempo de estancia deseado."
    }
  },
  de: {
    title: "EINLADUNG FÜR FREIWILLIGE",
    subtitle: "Heilung und Dienst im Amazonas",
    intro: "Das Zentrum Dos Mundos gründet sich auf dem Dienen. Wir bringen Menschen zusammen, die diesem Weg folgen. Anstatt professionelle Arbeitskräfte einzustellen, laden wir Freiwillige ein, damit jeder, der nach Dos Mundos kommt, seine Aufrichtigkeit zeigen, sich nützlich und gebraucht fühlen und seine Liebe in der Gemeinschaft zum Ausdruck bringen kann.\n\nWenn Sie den Ruf zur spirituellen Entwicklung spüren, laden wir Sie ein, sich unserer Gemeinschaft in Peru, im Herzen des Amazonas-Dschungels, anzuschließen. Dies ist eine Gelegenheit für diejenigen, die bereit sind für eine tiefe innere Transformation und den Weg der Heilung durch Dienen gehen möchten, sowie für die Arbeit mit traditionellen Pflanzen unter der Leitung des Heilers Pepe.",
    sections: [
      {
        title: "Was Wir Bieten",
        text: "Einen sicheren Raum für Heilung mit Ayahuasca und anderen traditionellen Pflanzen. Bio-Ernährung mit Produkten von unserer eigenen Farm. Eine gesunde Umgebung und Unterkunft, die es Ihnen ermöglicht, sich von der Hektik der modernen Welt zu lösen, wieder zu sich selbst zu finden und die Verbindung zur Natur wiederherzustellen."
      },
      {
        title: "Wen Wir Suchen",
        text: "Wir suchen Freiwillige, die ihren eigenen Heilungsweg mit dem Dienst an anderen verbinden möchten. Dies ist nicht nur ein Retreat – es ist eine tiefe transformative Erfahrung, bei der Wachstum durch gelebtes Dienen geschieht."
      }
    ],
    waysToServe: {
      title: "Möglichkeiten zu Dienen",
      items: [
        { icon: Sprout, text: "Farm- und Tierpflege: Pflege von Kühen, Ziegen, Meerschweinchen, Kaninchen, Hühnern und Pferden" },
        { icon: Utensils, text: "Hilfe in der Küche: Zubereitung von Speisen und Reinigung" },
        { icon: Home, text: "Hauswirtschaft: Reinigung von Zimmern und Bädern, Hilfe bei der Wäsche" },
        { icon: Users, text: "Arbeit in der Molkerei: Herstellung von Butter, Quark und Käse" },
        { icon: Fish, text: "Fischen: Hilfe beim Netzfischen (die Teilnahme von Männern, die sich mit dieser Arbeit wohlfühlen, ist besonders willkommen)" },
        { icon: Heart, text: "Unterstützung der Gemeinschaft: verschiedene Aufgaben, die zum Wohlstand und zur Entwicklung unserer Gemeinschaft beitragen" }
      ]
    },
    philosophy: {
      title: "Philosophie des Zentrums",
      text: "Wir glauben, dass wahre Heilung sowohl durch tiefe innere Arbeit als auch durch Dienen kommt. Jeder Tag in Dos Mundos ist eine Gelegenheit zur Transformation durch Praxis, Verbindung mit der Natur und herzliches Dienen."
    },
    closing: {
      title: "Schließen Sie sich uns an",
      text: "Wenn Sie den Ruf spüren, diesen Weg der Heilung und des Dienens mit uns zu gehen, erwarten wir Sie. Schreiben Sie uns über sich, Ihre Erfahrung und die gewünschte Aufenthaltsdauer."
    }
  },
  fr: {
    title: "INVITATION AUX BÉNÉVOLES",
    subtitle: "Guérison et Service en Amazonie",
    intro: "Le Centre Dos Mundos est fondé sur le service. Nous réunissons des personnes qui suivent cette voie. Au lieu d'embaucher des travailleurs professionnels, nous invitons des bénévoles afin que chacun venant à Dos Mundos puisse exprimer sa sincérité, se sentir utile et nécessaire, et manifester son amour au sein de la communauté.\n\nSi vous ressentez l'appel du développement spirituel, nous vous invitons à rejoindre notre communauté située au Pérou, au cœur de la jungle amazonienne. C'est une opportunité pour ceux qui sont prêts pour une profonde transformation intérieure et souhaitent parcourir le chemin de la guérison par le service, ainsi que travailler avec des plantes traditionnelles sous la direction du guérisseur Pepe.",
    sections: [
      {
        title: "Ce Que Nous Offrons",
        text: "Un espace sûr pour la guérison avec l'Ayahuasca et d'autres plantes traditionnelles. Une alimentation biologique issue des produits de notre propre ferme. Un environnement sain et un hébergement vous permettant de vous déconnecter de l'agitation du monde moderne, de vous reconnecter avec vous-même et de rétablir le lien avec la nature."
      },
      {
        title: "Qui Nous Recherchons",
        text: "Nous recherchons des bénévoles qui souhaitent combiner leur propre chemin de guérison avec le service aux autres. Ce n'est pas simplement une retraite — c'est une expérience transformationnelle profonde où la croissance se produit à travers le service manifesté."
      }
    ],
    waysToServe: {
      title: "Façons de Servir",
      items: [
        { icon: Sprout, text: "Soins de la ferme et des animaux : soins aux vaches, chèvres, cochons d'Inde, lapins, poules et chevaux" },
        { icon: Utensils, text: "Aide en cuisine : préparation des repas et nettoyage" },
        { icon: Home, text: "Entretien ménager : nettoyage des chambres et des salles de bain, aide à la lessive" },
        { icon: Users, text: "Travail à la laiterie : fabrication de beurre, de fromage blanc et de fromage" },
        { icon: Fish, text: "Pêche : aide à la pêche au filet (la participation des hommes à l'aise avec ce travail est particulièrement bienvenue)" },
        { icon: Heart, text: "Soutien communautaire : diverses tâches contribuant à la prospérité et au développement de notre communauté" }
      ]
    },
    philosophy: {
      title: "Philosophie du Centre",
      text: "Nous croyons que la véritable guérison vient à la fois d'un travail intérieur profond et du service. Chaque jour à Dos Mundos est une opportunité de transformation par la pratique, la connexion avec la nature et le service sincère."
    },
    closing: {
      title: "Rejoignez-nous",
      text: "Si vous ressentez l'appel à parcourir ce chemin de guérison et de service avec nous, nous vous attendons. Écrivez-nous à propos de vous, de votre expérience et de la durée de séjour souhaitée."
    }
  },
  pl: {
    title: "ZAPROSZENIE DLA WOLONTARIUSZY",
    subtitle: "Uzdrowienie i Służba w Amazonii",
    intro: "Centrum Dos Mundos opiera się na służbie. Łączymy ludzi, którzy podążają tą ścieżką. Zamiast zatrudniać profesjonalnych pracowników, zapraszamy wolontariuszy, aby każdy przybywający do Dos Mundos mógł wyrazić swoją szczerość, poczuć się użytecznym i potrzebnym, a także okazać swoją miłość we wspólnocie.\n\nJeśli czujesz powołanie do rozwoju duchowego, zapraszamy Cię do dołączenia do naszej społeczności położonej w Peru, w sercu amazońskiej dżungli. To szansa dla tych, którzy są gotowi na głęboką wewnętrzną transformację i pragną przejść drogę uzdrowienia poprzez służbę, a także pracę z tradycyjnymi roślinami pod przewodnictwem uzdrowiciela Pepe.",
    sections: [
      {
        title: "Co Oferujemy",
        text: "Bezpieczną przestrzeń do uzdrowienia z Ayahuascą i innymi tradycyjnymi roślinami. Organiczne jedzenie z produktów z naszej własnej farmy. Zdrowe środowisko i zakwaterowanie, które pozwolą Ci odłączyć się od zgiełku współczesnego świata, połączyć się ze sobą i przywrócić więź z naturą."
      },
      {
        title: "Kogo Szukamy",
        text: "Szukamy wolontariuszy, którzy chcą połączyć własną drogę uzdrowienia ze służbą innym. To nie jest zwykły warsztat — to głębokie doświadczenie transformacyjne, gdzie wzrost następuje poprzez jawną służbę."
      }
    ],
    waysToServe: {
      title: "Sposoby Służenia",
      items: [
        { icon: Sprout, text: "Opieka nad farmą i zwierzętami: dbanie o krowy, kozy, świnki morskie, króliki, kury i konie" },
        { icon: Utensils, text: "Pomoc w kuchni: przygotowywanie posiłków i sprzątanie" },
        { icon: Home, text: "Dbanie o dom: sprzątanie pokoi i łazienek, pomoc w praniu" },
        { icon: Users, text: "Praca w serowarni: wyrób masła, twarogu i sera" },
        { icon: Fish, text: "Rybołówstwo: pomoc w łowieniu ryb sieciami (szczególnie mile widziany udział mężczyzn czujących się komfortowo w tej pracy)" },
        { icon: Heart, text: "Wsparcie społeczności: różne zadania przyczyniające się do dobrobytu i rozwoju naszej społeczności" }
      ]
    },
    philosophy: {
      title: "Filozofia Centrum",
      text: "Wierzymy, że prawdziwe uzdrowienie przychodzi zarówno poprzez głęboką pracę wewnętrzną, jak i poprzez służbę. Każdy dzień w Dos Mundos to okazja do transformacji poprzez praktykę, kontakt z naturą i serdeczną służbę."
    },
    closing: {
      title: "Dołącz do Nas",
      text: "Jeśli czujesz wezwanie, by przejść tę drogę uzdrowienia i służby razem z nami, czekamy na Ciebie. Napisz o sobie, swoim doświadczeniu i pożądanym czasie pobytu."
    }
  }
};

const VolunteersPage = () => {
  const { lang } = useParams();
  const currentLang = (lang && content[lang]) ? lang : 'en';
  const t = content[currentLang];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 pb-20">
      {/* Hero Section */}
      <div className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white tracking-tight"
          >
            {t.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-purple-200 font-medium"
          >
            {t.subtitle}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-1 w-24 bg-purple-500 mx-auto rounded-full"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-16">
        {/* Intro */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-lg leading-relaxed text-slate-300 text-center max-w-3xl mx-auto space-y-4"
        >
          {t.intro.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </motion.div>

        {/* Main Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {t.sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <h3 className="text-2xl font-bold text-white mb-4">{section.title}</h3>
              <p className="text-slate-300 leading-relaxed">{section.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Ways to Serve */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white text-center">{t.waysToServe.title}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {t.waysToServe.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 bg-slate-800/50 p-6 rounded-xl border border-white/5"
              >
                <div className="p-3 bg-purple-500/20 rounded-lg shrink-0">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-slate-300">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Philosophy & Closing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl p-8 md:p-12 text-center space-y-8 border border-white/10"
        >
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">{t.philosophy.title}</h3>
            <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t.philosophy.text}
            </p>
          </div>
          
          <div className="pt-8 border-t border-white/10 space-y-4">
            <h3 className="text-2xl font-bold text-white">{t.closing.title}</h3>
            <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t.closing.text}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VolunteersPage;
