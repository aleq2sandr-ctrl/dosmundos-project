import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Users, Home, Fish, Utensils, Sprout } from 'lucide-react';

const content = {
  ru: {
    title: "ПРИГЛАШЕНИЕ ВОЛОНТЁРОВ",
    subtitle: "Приглашение Волонтёров: Исцеление и Служение в Амазонии",
    intro: "Мы приглашаем вас присоединиться к нашему сообществу, расположенному в самом сердце амазонских джунглей. Это возможность для тех, кто готов к глубокой личной трансформации через работу с растениями, традиционные диеты и скромную жизнь в гармонии с природой.",
    sections: [
      {
        title: "Что Мы Предлагаем",
        text: "Наше сообщество предоставляет сакральное пространство для исцеления с аяуаской и другими растениями, поддерживаемой традиционными практиками, включая диеты с растениями, терапевтические горячие ванны и питательную простую пищу, приготовленную с минимальным количеством специй. Размещение простое, позволяющее вам отключиться от современных отвлекающих факторов и воссоединиться с собой и миром природы."
      },
      {
        title: "Кого Мы Ищем",
        text: "Мы ищем волонтёров, которые хотят совместить свой собственный путь исцеления со служением. Это не ретрит—это погружающий опыт роста через служение."
      }
    ],
    waysToServe: {
      title: "Способы Служения",
      items: [
        { icon: Sprout, text: "Уход за Фермой и Животными: Забота о наших коровах, козах, морских свинках, кроликах, курах и лошадях" },
        { icon: Utensils, text: "Помощь на Кухне: Приготовление пищи и Уборка" },
        { icon: Home, text: "Уход за Домом: Уборка комнат, ванных комнат и помощь со стиркой" },
        { icon: Users, text: "Работа в молочном цехе: приготовление масла, творога и сыра" },
        { icon: Fish, text: "Рыбалка: Помощь с рыбалкой сетями (особенно для мужчин, комфортно себя чувствующих с этой работой)" },
        { icon: Heart, text: "Общая Поддержка Сообщества: Различные задачи, которые поддерживают процветание нашего сообщества" }
      ]
    },
    exchange: {
      title: "Обмен",
      text: "В обмен на ваше преданное служение, вы получите жильё, питание и возможность участвовать в наших исцеляющих церемониях и практиках. Это путь для тех, кто понимает, что истинное исцеление приходит как через внутреннюю работу, так и через служение."
    },
    closing: "Если вы чувствуете призыв пройти этот путь исцеления и служения с нами, мы ждём вас."
  },
  en: {
    title: "VOLUNTEER INVITATION",
    subtitle: "Invitation for Volunteers: Healing and Service in the Amazon",
    intro: "We invite you to join our community located in the heart of the Amazon rainforest. This is an opportunity for those ready for deep personal transformation through work with plants, traditional dietas, and humble living in harmony with nature.",
    sections: [
      {
        title: "What We Offer",
        text: "Our community provides a sacred space for healing with ayahuasca and other plants, supported by traditional practices including plant dietas, therapeutic hot baths, and nourishing simple food prepared with minimal spices. Accommodations are simple, allowing you to disconnect from modern distractions and reconnect with yourself and the nature."
      },
      {
        title: "Who We’re Looking For",
        text: "We seek volunteers who want to combine their own healing journey with service. This is not a retreat—it’s an immersive experience of growth through service."
      }
    ],
    waysToServe: {
      title: "Ways to Serve",
      items: [
        { icon: Sprout, text: "Farm & Animal Care: Caring for our cows, goats, guinea pigs, rabbits, chickens, and horses" },
        { icon: Utensils, text: "Kitchen Support: Food preparation and cooking" },
        { icon: Home, text: "Household Maintenance: Cleaning rooms, bathrooms, and assisting with laundry" },
        { icon: Users, text: "Dairy Work: Making butter, cheese, and cottage cheese" },
        { icon: Fish, text: "Fishing: Helping with net fishing (especially for men comfortable with this work)" },
        { icon: Heart, text: "General Community Support: Various tasks that support our community’s prosperity" }
      ]
    },
    exchange: {
      title: "The Exchange",
      text: "In return for your dedicated service, you’ll receive accommodation, meals, and the opportunity to participate in our healing ceremonies and practices. This is a path for those who understand that true healing comes through both inner work and service."
    },
    closing: "If you feel the call to walk this path of healing and service with us, we are waiting for you."
  },
  es: {
    title: "LLAMADO A VOLUNTARIOS",
    subtitle: "Sanación y Servicio en la Amazonía",
    intro: "Invitamos a almas dedicadas a unirse a nuestra comunidad de sanación ubicada en el corazón de la selva amazónica. Esta es una oportunidad para quienes buscan una transformación personal profunda a través de la medicina de plantas, dietas tradicionales y una vida humilde en armonía con la naturaleza.",
    sections: [
      {
        title: "Lo Que Ofrecemos",
        text: "Nuestra comunidad proporciona un espacio sagrado para el trabajo de sanación con ayahuasca y otras medicinas de plantas, apoyado por prácticas tradicionales que incluyen dietas curativas, baños terapéuticos calientes y alimentos nutritivos simples preparados con especias mínimas. Las acomodaciones son básicas, permitiéndote desconectarte de las distracciones modernas y reconectarte contigo mismo y con el mundo natural."
      },
      {
        title: "A Quién Buscamos",
        text: "Buscamos voluntarios que deseen combinar su propio camino de sanación con el servicio a los demás. Esto no es un retiro—es una experiencia inmersiva de crecimiento a través del servicio."
      }
    ],
    waysToServe: {
      title: "Formas de Servir",
      items: [
        { icon: Sprout, text: "Cuidado de la Granja y Animales: Atender nuestras vacas, cabras, cuyes, conejos, gallinas y caballos" },
        { icon: Utensils, text: "Apoyo en la Cocina: Preparación de alimentos y cocina" },
        { icon: Home, text: "Mantenimiento del Hogar: Limpieza de habitaciones, baños y ayuda con la lavandería" },
        { icon: Users, text: "Trabajar en lechería: elaborar mantequilla, requesón y queso" },
        { icon: Fish, text: "Pesca: Ayudar con la pesca con redes (particularmente para hombres cómodos con este trabajo)" },
        { icon: Heart, text: "Apoyo General a la Comunidad: Diversas tareas que mantienen nuestra comunidad próspera" }
      ]
    },
    exchange: {
      title: "El Intercambio",
      text: "A cambio de tu servicio dedicado, recibirás alojamiento, comidas y la oportunidad de participar en nuestras ceremonias y prácticas de sanación. Este es un camino para quienes entienden que la verdadera sanación viene tanto del trabajo interior como del servicio hacia afuera."
    },
    closing: "Si sientes el llamado de caminar este sendero de sanación y servicio con nosotros, damos la bienvenida a tu consulta."
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
          className="text-lg leading-relaxed text-slate-300 text-center max-w-3xl mx-auto"
        >
          {t.intro}
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

        {/* Exchange & Closing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-3xl p-8 md:p-12 text-center space-y-8 border border-white/10"
        >
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">{t.exchange.title}</h3>
            <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {t.exchange.text}
            </p>
          </div>
          
          <div className="pt-8 border-t border-white/10">
            <p className="text-xl font-medium text-white italic">
              "{t.closing}"
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VolunteersPage;
