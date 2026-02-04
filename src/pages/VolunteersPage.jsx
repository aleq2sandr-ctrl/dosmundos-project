import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Users, Home, Fish, Utensils, Sprout } from 'lucide-react';

const content = {
  ru: {
    title: "ПРИГЛАШЕНИЕ ВОЛОНТЁРОВ",
    subtitle: "Центр интегрального развития и целительства",
    intro: "Центр Дос Мундос — это центр интегрального развития и целительства, который рассматривает исцеление в его обширном значении. В центре существует производственная часть, включающая рыбное и фермерское хозяйство, что позволяет использовать органическую пищу в поддержку целительской работы и обеспечивать экологическими продуктами всех, кто приезжает на исцеление.\n\nОснова философии центра — это служение, или любовь в действии. Наши двери открыты для всех без исключения, независимо от положения. Если у вас нет возможности оплачивать ваше лечение, но есть желание служить и пройти процессы исцеления, мы приглашаем вас присоединиться к нам.",
    sections: [
      {
        title: "Наше Приглашение",
        text: "Если вы чувствуете зов к внутреннему развитию, мы приглашаем вас присоединиться к нашему сообществу, расположенному в Перу, в сердце амазонских джунглей. Это возможность для тех, кто готов к глубокой внутренней трансформации и желает пройти путь исцеления через служение, а также работу с традиционными растениями под руководством Мастера и целителя Пепе Ордоньеса."
      },
      {
        title: "Что Мы Предлагаем",
        text: "• Пространство любви, в котором мирно сосуществуют люди, животные и растения\n• Возможность глубокой внутренней работы и исцеления при помощи растений-энтеогенов (аяуаска, Сан Педро, тоэ и другие)\n• Традиционные диеты с растениями-учителями в исконных традициях амазонских мастеров\n• Здоровую среду и жильё, позволяющие отключиться от суеты современного мира, соединиться с собой и восстановить связь с природой\n• Здоровое органическое питание из продуктов нашей собственной фермы"
      },
      {
        title: "Кого Мы Ищем",
        text: "Мы ищем волонтёров, которые хотят совместить свой собственный путь исцеления со служением. Это не просто ретрит — это глубокий трансформационный опыт, где рост происходит через проявленное служение."
      }
    ],
    waysToServe: {
      title: "Способы Служения",
      items: [
        { icon: Sprout, text: "На ферме: забота о коровах, козах, морских свинках, кроликах, курах и лошадях" },
        { icon: Utensils, text: "Помощь на кухне: приготовление пищи и уборка" },
        { icon: Home, text: "Поддержание чистоты: уборка комнат и ванных комнат, помощь со стиркой" },
        { icon: Users, text: "Помощь в молочном цехе: приготовление масла, творога и сыра" },
        { icon: Fish, text: "Рыбное хозяйство: помощь с ловлей рыбы сетями (особенно приветствуется участие мужчин, комфортно чувствующих себя с этим видом служения)" },
        { icon: Heart, text: "Поддержка сообщества: различные задачи, способствующие развитию нашего сообщества" }
      ]
    },
    philosophy: {
      title: "Философия Центра",
      text: "Мы верим, что истинное исцеление приходит как через глубокую внутреннюю работу, так и через служение. Каждый день в центре Дос Мундос — это возможность трансформации через практику служения, соединение с природой и взаимодействие с растениями-учителями."
    },
    closing: {
      title: "Мы Ждём Вас",
      text: "Если вы чувствуете зов пройти вместе с нами путь исцеления и трансформации для обретения гармонии и равновесия, свяжитесь с нами."
    }
  },
  en: {
    title: "VOLUNTEER INVITATION",
    subtitle: "Center for Integral Development and Healing",
    intro: "Dos Mundos Center is a center for integral development and healing that views healing in its broadest sense. The center has a production section that includes fish and farm farming, which allows us to use organic food to support healing work and provide ecological products to everyone who comes for healing.\n\nThe foundation of the center's philosophy is service, or love in action. Our doors are open to everyone without exception, regardless of position. If you cannot afford your treatment but have the desire to serve and go through healing processes, we invite you to join us.",
    sections: [
      {
        title: "Our Invitation",
        text: "If you feel a call to inner development, we invite you to join our community located in Peru, in the heart of the Amazon jungle. This is an opportunity for those ready for deep inner transformation and wishing to walk the path of healing through service, as well as work with traditional plants under the guidance of Master and healer Pepe Ordoñez."
      },
      {
        title: "What We Offer",
        text: "• A space of love where people, animals, and plants coexist peacefully\n• Opportunity for deep inner work and healing with the help of entheogenic plants (ayahuasca, San Pedro, toe, and others)\n• Traditional diets with teacher plants in the authentic traditions of Amazonian masters\n• Healthy environment and housing that allow you to disconnect from the hustle and bustle of the modern world, connect with yourself, and restore your connection with nature\n• Healthy organic nutrition from the products of our own farm"
      },
      {
        title: "Who We Are Looking For",
        text: "We are looking for volunteers who want to combine their own healing journey with service. This is not just a retreat — it is a deep transformational experience where growth happens through manifested service."
      }
    ],
    waysToServe: {
      title: "Ways to Serve",
      items: [
        { icon: Sprout, text: "On the farm: caring for cows, goats, guinea pigs, rabbits, chickens, and horses" },
        { icon: Utensils, text: "Kitchen help: food preparation and cleaning" },
        { icon: Home, text: "Maintaining cleanliness: cleaning rooms and bathrooms, helping with laundry" },
        { icon: Users, text: "Help in the dairy workshop: making butter, cottage cheese, and cheese" },
        { icon: Fish, text: "Fish farming: helping with net fishing (participation of men comfortable with this type of service is especially welcome)" },
        { icon: Heart, text: "Community support: various tasks contributing to the development of our community" }
      ]
    },
    philosophy: {
      title: "Center Philosophy",
      text: "We believe that true healing comes both through deep inner work and through service. Every day at Dos Mundos Center is an opportunity for transformation through the practice of service, connection with nature, and interaction with teacher plants."
    },
    closing: {
      title: "We Are Waiting For You",
      text: "If you feel the call to walk the path of healing and transformation with us to find harmony and balance, contact us."
    }
  },
  es: {
    title: "LLAMADO A VOLUNTARIOS",
    subtitle: "Centro de Desarrollo Integral y Sanación",
    intro: "El Centro Dos Mundos es un centro de desarrollo integral y sanación que considera la sanación en su sentido más amplio. El centro cuenta con una sección de producción que incluye piscicultura y agricultura, lo que nos permite utilizar alimentos orgánicos para apoyar el trabajo de sanación y proporcionar productos ecológicos a todos los que vienen para sanar.\n\nLa base de la filosofía del centro es el servicio, o el amor en acción. Nuestras puertas están abiertas para todos sin excepción, independientemente de la posición. Si no puedes pagar tu tratamiento pero tienes el deseo de servir y pasar por procesos de sanación, te invitamos a unirte a nosotros.",
    sections: [
      {
        title: "Nuestra Invitación",
        text: "Si sientes un llamado al desarrollo interior, te invitamos a unirte a nuestra comunidad ubicada en Perú, en el corazón de la selva amazónica. Esta es una oportunidad para aquellos que están listos para una profunda transformación interior y desean recorrer el camino de sanación a través del servicio, así como trabajar con plantas tradicionales bajo la guía del Maestro y sanador Pepe Ordoñez."
      },
      {
        title: "Lo Que Ofrecemos",
        text: "• Un espacio de amor donde personas, animales y plantas coexisten pacíficamente\n• Oportunidad para un trabajo interior profundo y sanación con la ayuda de plantas enteógenas (ayahuasca, San Pedro, toe y otras)\n• Dietas tradicionales con plantas maestras en las tradiciones auténticas de los maestros amazónicos\n• Ambiente saludable y vivienda que te permiten desconectarte del ajetreo del mundo moderno, conectarte contigo mismo y restaurar tu conexión con la naturaleza\n• Nutrición orgánica saludable de los productos de nuestra propia granja"
      },
      {
        title: "A Quién Buscamos",
        text: "Buscamos voluntarios que quieran combinar su propio camino de sanación con el servicio. Esto no es solo un retiro, es una experiencia de transformación profunda donde el crecimiento ocurre a través del servicio manifestado."
      }
    ],
    waysToServe: {
      title: "Formas de Servir",
      items: [
        { icon: Sprout, text: "En la granja: cuidado de vacas, cabras, cuyes, conejos, gallinas y caballos" },
        { icon: Utensils, text: "Ayuda en la cocina: preparación de alimentos y limpieza" },
        { icon: Home, text: "Mantenimiento de la limpieza: limpieza de habitaciones y baños, ayuda con la lavandería" },
        { icon: Users, text: "Ayuda en la lechería: elaboración de mantequilla, requesón y queso" },
        { icon: Fish, text: "Piscicultura: ayuda con la pesca con redes (se agradece especialmente la participación de hombres que se sientan cómodos con este tipo de servicio)" },
        { icon: Heart, text: "Apoyo a la comunidad: diversas tareas que contribuyen al desarrollo de nuestra comunidad" }
      ]
    },
    philosophy: {
      title: "Filosofía del Centro",
      text: "Creemos que la verdadera sanación llega tanto a través del trabajo interior profundo como a través del servicio. Cada día en el Centro Dos Mundos es una oportunidad de transformación a través de la práctica del servicio, la conexión con la naturaleza y la interacción con plantas maestras."
    },
    closing: {
      title: "Te Esperamos",
      text: "Si sientes el llamado a recorrer el camino de sanación y transformación con nosotros para encontrar armonía y equilibrio, contáctanos."
    }
  },
  de: {
    title: "EINLADUNG FÜR FREIWILLIGE",
    subtitle: "Zentrum für integrale Entwicklung und Heilung",
    intro: "Das Zentrum Dos Mundos ist ein Zentrum für integrale Entwicklung und Heilung, das Heilung in ihrer umfassendsten Bedeutung betrachtet. Das Zentrum verfügt über einen Produktionsbereich, der Fisch- und Landwirtschaft umfasst, was es uns ermöglicht, biologische Lebensmittel zur Unterstützung der Heilungsarbeit zu nutzen und ökologische Produkte für alle bereitzustellen, die zur Heilung kommen.\n\nDie Grundlage der Philosophie des Zentrums ist der Dienst oder die Liebe in Aktion. Unsere Türen stehen allen ohne Ausnahme offen, unabhängig von der Position. Wenn Sie sich Ihre Behandlung nicht leisten können, aber den Wunsch haben, zu dienen und Heilungsprozesse zu durchlaufen, laden wir Sie ein, sich uns anzuschließen.",
    sections: [
      {
        title: "Unsere Einladung",
        text: "Wenn Sie den Ruf zur inneren Entwicklung spüren, laden wir Sie ein, sich unserer Gemeinschaft in Peru, im Herzen des Amazonas-Dschungels, anzuschließen. Dies ist eine Gelegenheit für diejenigen, die bereit sind für eine tiefe innere Transformation und den Weg der Heilung durch Dienst gehen möchten, sowie für die Arbeit mit traditionellen Pflanzen unter der Leitung von Meister und Heiler Pepe Ordoñez."
      },
      {
        title: "Was Wir Bieten",
        text: "• Einen Raum der Liebe, in dem Menschen, Tiere und Pflanzen friedlich zusammenleben\n• Möglichkeit für tiefe innere Arbeit und Heilung mit Hilfe entheogener Pflanzen (Ayahuasca, San Pedro, Toe und andere)\n• Traditionelle Diäten mit Lehrerpflanzen in den authentischen Traditionen amazonischer Meister\n• Gesunde Umgebung und Unterkunft, die es Ihnen ermöglichen, sich vom Trubel der modernen Welt zu lösen, mit sich selbst in Verbindung zu treten und Ihre Verbindung zur Natur wiederherzustellen\n• Gesunde biologische Ernährung aus den Produkten unserer eigenen Farm"
      },
      {
        title: "Wen Wir Suchen",
        text: "Wir suchen Freiwillige, die ihren eigenen Heilungsweg mit dem Dienst verbinden möchten. Dies ist nicht nur ein Retreat – es ist eine tiefe transformative Erfahrung, bei der Wachstum durch gelebten Dienst geschieht."
      }
    ],
    waysToServe: {
      title: "Möglichkeiten zu Dienen",
      items: [
        { icon: Sprout, text: "Auf der Farm: Pflege von Kühen, Ziegen, Meerschweinchen, Kaninchen, Hühnern und Pferden" },
        { icon: Utensils, text: "Hilfe in der Küche: Zubereitung von Speisen und Reinigung" },
        { icon: Home, text: "Reinigung aufrechterhalten: Reinigung von Zimmern und Badezimmern, Hilfe bei der Wäsche" },
        { icon: Users, text: "Hilfe in der Molkerei: Herstellung von Butter, Quark und Käse" },
        { icon: Fish, text: "Fischzucht: Hilfe beim Netzfischen (die Teilnahme von Männern, die sich mit dieser Art von Dienst wohlfühlen, ist besonders willkommen)" },
        { icon: Heart, text: "Unterstützung der Gemeinschaft: verschiedene Aufgaben, die zur Entwicklung unserer Gemeinschaft beitragen" }
      ]
    },
    philosophy: {
      title: "Philosophie des Zentrums",
      text: "Wir glauben, dass wahre Heilung sowohl durch tiefe innere Arbeit als auch durch Dienst kommt. Jeder Tag im Zentrum Dos Mundos ist eine Gelegenheit zur Transformation durch die Praxis des Dienens, die Verbindung mit der Natur und die Interaktion mit Lehrerpflanzen."
    },
    closing: {
      title: "Wir Warten Auf Sie",
      text: "Wenn Sie den Ruf spüren, den Weg der Heilung und Transformation mit uns zu gehen, um Harmonie und Gleichgewicht zu finden, kontaktieren Sie uns."
    }
  },
  fr: {
    title: "INVITATION AUX BÉNÉVOLES",
    subtitle: "Centre de Développement Intégral et de Guérison",
    intro: "Le Centre Dos Mundos est un centre de développement intégral et de guérison qui considère la guérison dans son sens le plus large. Le centre dispose d'une section de production qui comprend la pisciculture et l'agriculture, ce qui nous permet d'utiliser des aliments biologiques pour soutenir le travail de guérison et fournir des produits écologiques à tous ceux qui viennent pour guérir.\n\nLa base de la philosophie du centre est le service, ou l'amour en action. Nos portes sont ouvertes à tous sans exception, quelle que soit la position. Si vous ne pouvez pas payer votre traitement mais avez le désir de servir et de passer par des processus de guérison, nous vous invitons à nous rejoindre.",
    sections: [
      {
        title: "Notre Invitation",
        text: "Si vous ressentez un appel au développement intérieur, nous vous invitons à rejoindre notre communauté située au Pérou, au cœur de la jungle amazonienne. C'est une opportunité pour ceux qui sont prêts pour une profonde transformation intérieure et souhaitent parcourir le chemin de la guérison par le service, ainsi que travailler avec des plantes traditionnelles sous la direction du Maître et guérisseur Pepe Ordoñez."
      },
      {
        title: "Ce Que Nous Offrons",
        text: "• Un espace d'amour où les personnes, les animaux et les plantes coexistent pacifiquement\n• Opportunité pour un travail intérieur profond et la guérison avec l'aide de plantes enthéogènes (ayahuasca, San Pedro, toe et autres)\n• Régimes traditionnels avec des plantes enseignantes dans les traditions authentiques des maîtres amazoniens\n• Environnement sain et logement qui vous permettent de vous déconnecter de l'agitation du monde moderne, de vous connecter avec vous-même et de restaurer votre lien avec la nature\n• Nutrition biologique saine à partir des produits de notre propre ferme"
      },
      {
        title: "Qui Nous Recherchons",
        text: "Nous recherchons des bénévoles qui souhaitent combiner leur propre chemin de guérison avec le service. Ce n'est pas simplement une retraite — c'est une expérience transformationnelle profonde où la croissance se produit à travers le service manifesté."
      }
    ],
    waysToServe: {
      title: "Façons de Servir",
      items: [
        { icon: Sprout, text: "À la ferme : soins aux vaches, chèvres, cochons d'Inde, lapins, poules et chevaux" },
        { icon: Utensils, text: "Aide en cuisine : préparation des repas et nettoyage" },
        { icon: Home, text: "Maintenir la propreté : nettoyage des chambres et des salles de bain, aide au linge" },
        { icon: Users, text: "Aide à la laiterie : fabrication de beurre, de fromage blanc et de fromage" },
        { icon: Fish, text: "Pisciculture : aide à la pêche au filet (la participation d'hommes à l'aise avec ce type de service est particulièrement bienvenue)" },
        { icon: Heart, text: "Soutien communautaire : diverses tâches contribuant au développement de notre communauté" }
      ]
    },
    philosophy: {
      title: "Philosophie du Centre",
      text: "Nous croyons que la véritable guérison vient à la fois d'un travail intérieur profond et du service. Chaque jour au Centre Dos Mundos est une opportunité de transformation à travers la pratique du service, la connexion avec la nature et l'interaction avec les plantes enseignantes."
    },
    closing: {
      title: "Nous Vous Attendons",
      text: "Si vous ressentez l'appel à parcourir le chemin de la guérison et de la transformation avec nous pour trouver l'harmonie et l'équilibre, contactez-nous."
    }
  },
  pl: {
    title: "ZAPROSZENIE DLA WOLONTARIUSZY",
    subtitle: "Centrum Integralnego Rozwoju i Uzdrawiania",
    intro: "Centrum Dos Mundos to centrum integralnego rozwoju i uzdrawiania, które postrzega uzdrowienie w jego najszerszym znaczeniu. Centrum posiada sekcję produkcyjną obejmującą rybołówstwo i rolnictwo, co pozwala nam wykorzystywać organiczną żywność do wspierania pracy uzdrawiającej i zapewniać ekologiczne produkty wszystkim, którzy przyjeżdżają na uzdrowienie.\n\nPodstawą filozofii centrum jest służba, czyli miłość w działaniu. Nasze drzwi są otwarte dla wszystkich bez wyjątku, niezależnie od pozycji. Jeśli nie możesz sobie pozwolić na leczenie, ale masz pragnienie służenia i przechodzenia przez procesy uzdrawiania, zapraszamy Cię do dołączenia do nas.",
    sections: [
      {
        title: "Nasze Zaproszenie",
        text: "Jeśli czujesz powołanie do rozwoju wewnętrznego, zapraszamy Cię do dołączenia do naszej społeczności położonej w Peru, w sercu amazońskiej dżungli. To szansa dla tych, którzy są gotowi na głęboką wewnętrzną transformację i pragną przejść drogę uzdrowienia poprzez służbę, a także pracę z tradycyjnymi roślinami pod przewodnictwem Mistrza i uzdrowiciela Pepe Ordoñez."
      },
      {
        title: "Co Oferujemy",
        text: "• Przestrzeń miłości, w której ludzie, zwierzęta i rośliny pokojowo współistnieją\n• Możliwość głębokiej pracy wewnętrznej i uzdrowienia z pomocą roślin enteogenicznych (ayahuasca, San Pedro, toe i inne)\n• Tradycyjne diety z roślinami nauczycielami w autentycznych tradycjach amazońskich mistrzów\n• Zdrowe środowisko i zakwaterowanie, które pozwalają odłączyć się od zgiełku współczesnego świata, połączyć się ze sobą i przywrócić więź z naturą\n• Zdrowe organiczne odżywianie z produktów naszej własnej farmy"
      },
      {
        title: "Kogo Szukamy",
        text: "Szukamy wolontariuszy, którzy chcą połączyć własną drogę uzdrowienia ze służbą. To nie jest zwykły warsztat — to głębokie doświadczenie transformacyjne, gdzie wzrost następuje poprzez jawną służbę."
      }
    ],
    waysToServe: {
      title: "Sposoby Służenia",
      items: [
        { icon: Sprout, text: "Na farmie: opieka nad krowami, kozami, świnkami morskimi, królikami, kurami i końmi" },
        { icon: Utensils, text: "Pomoc w kuchni: przygotowywanie posiłków i sprzątanie" },
        { icon: Home, text: "Utrzymanie czystości: sprzątanie pokoi i łazienek, pomoc w praniu" },
        { icon: Users, text: "Pomoc w mleczarni: wyrób masła, twarogu i sera" },
        { icon: Fish, text: "Hodowla ryb: pomoc w łowieniu ryb sieciami (szczególnie mile widziany udział mężczyzn czujących się komfortowo z tym rodzajem służby)" },
        { icon: Heart, text: "Wsparcie społeczności: różne zadania przyczyniające się do rozwoju naszej społeczności" }
      ]
    },
    philosophy: {
      title: "Filozofia Centrum",
      text: "Wierzymy, że prawdziwe uzdrowienie przychodzi zarówno poprzez głęboką pracę wewnętrzną, jak i poprzez służbę. Każdy dzień w Centrum Dos Mundos to okazja do transformacji poprzez praktykę służby, połączenie z naturą i interakcję z roślinami nauczycielami."
    },
    closing: {
      title: "Czekamy na Ciebie",
      text: "Jeśli czujesz powołanie, by przejść drogę uzdrowienia i transformacji z nami, aby znaleźć harmonię i równowagę, skontaktuj się z nami."
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

        {/* Photo Gallery */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <img 
                src="/images/volunteers/volunteer1.png" 
                alt="Центр Дос Мундос" 
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <img 
                src="/images/volunteers/volunteer2.jpg" 
                alt="Ферма и животные" 
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <img 
                src="/images/volunteers/volunteer3.jpg" 
                alt="Природа Амазонии" 
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="overflow-hidden rounded-2xl border border-white/10"
            >
              <img 
                src="/images/volunteers/volunteer4.jpg" 
                alt="Сообщество волонтеров" 
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
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
