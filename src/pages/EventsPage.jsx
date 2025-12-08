import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

const EventsPage = () => {
  const { lang } = useParams();
  const currentLanguage = lang || 'ru';

  const translations = {
    ru: {
      title: "События",
      subtitle: "Мероприятия и встречи в Dos Mundos",
      readMore: "Подробнее",
      events: [
        {
          id: 'new-year',
          title: "Священная Церемония Очищения",
          date: "31 декабря - 3 января 2025",
          location: "Dos Mundos, Yurimaguas",
          description: "Встречайте Новый год в сердце Амазонии. Уникальная программа, церемонии и погружение в природу.",
          image: "https://images.unsplash.com/photo-1546768292-fb12f6c92568?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80", // Placeholder
          link: `/${currentLanguage}/new-year`
        },
        {
          id: 'festival',
          title: "VI Encuentro Universal de Ancianos",
          date: "20 - 24 июня 2022",
          location: "Dos Mundos, Yurimaguas",
          description: "Встреча старейшин и целителей. Обмен мудростью и традициями предков.",
          image: "https://static.wixstatic.com/media/7e97c8_dce5900fbaf9480698d7bb1fb7fba3f3~mv2.jpg/v1/fill/w_280,h_272,al_c,lg_1,q_80,enc_avif,quality_auto/288443207_410951567711096_860690846006933208_n_edited.jpg",
          link: `/${currentLanguage}/festival`
        }
      ]
    },
    es: {
      title: "Eventos",
      subtitle: "Eventos y encuentros en Dos Mundos",
      readMore: "Leer más",
      events: [
        {
          id: 'new-year',
          title: "Ceremonia Sagrada de Purificación",
          date: "31 de diciembre - 3 de enero del 2025",
          location: "Dos Mundos, Yurimaguas",
          description: "Celebra el Año Nuevo en el corazón de la Amazonía. Programa único, ceremonias e inmersión en la naturaleza.",
          image: "https://images.unsplash.com/photo-1546768292-fb12f6c92568?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          link: `/${currentLanguage}/new-year`
        },
        {
          id: 'festival',
          title: "VI Encuentro Universal de Ancianos",
          date: "20 - 24 de junio de 2022",
          location: "Dos Mundos, Yurimaguas",
          description: "Encuentro de ancianos y sanadores. Intercambio de sabiduría y tradiciones ancestrales.",
          image: "https://static.wixstatic.com/media/7e97c8_dce5900fbaf9480698d7bb1fb7fba3f3~mv2.jpg/v1/fill/w_280,h_272,al_c,lg_1,q_80,enc_avif,quality_auto/288443207_410951567711096_860690846006933208_n_edited.jpg",
          link: `/${currentLanguage}/festival`
        }
      ]
    },
    en: {
      title: "Events",
      subtitle: "Events and meetings at Dos Mundos",
      readMore: "Read more",
      events: [
        {
          id: 'new-year',
          title: "Sacred Purification Ceremony",
          date: "December 31 - January 3, 2025",
          location: "Dos Mundos, Yurimaguas",
          description: "Celebrate New Year in the heart of the Amazon. Unique program, ceremonies, and immersion in nature.",
          image: "https://images.unsplash.com/photo-1546768292-fb12f6c92568?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          link: `/${currentLanguage}/new-year`
        },
        {
          id: 'festival',
          title: "VI Encuentro Universal de Ancianos",
          date: "June 20 - 24, 2022",
          location: "Dos Mundos, Yurimaguas",
          description: "Gathering of elders and healers. Sharing wisdom and ancestral traditions.",
          image: "https://static.wixstatic.com/media/7e97c8_dce5900fbaf9480698d7bb1fb7fba3f3~mv2.jpg/v1/fill/w_280,h_272,al_c,lg_1,q_80,enc_avif,quality_auto/288443207_410951567711096_860690846006933208_n_edited.jpg",
          link: `/${currentLanguage}/festival`
        }
      ]
    }
  };

  const t = translations[currentLanguage] || translations.en;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pt-20 pb-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.title}</h1>
          <p className="text-xl text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {t.events.map((event) => (
            <Link 
              key={event.id} 
              to={event.link}
              className="group bg-slate-800/50 rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all hover:bg-slate-800"
            >
              <div className="aspect-video overflow-hidden relative">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-medium mb-1">
                    <Calendar size={16} />
                    <span>{event.date}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {event.title}
                </h2>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                  <MapPin size={16} />
                  <span>{event.location}</span>
                </div>
                <p className="text-slate-300 mb-6 line-clamp-3">
                  {event.description}
                </p>
                <div className="flex items-center text-orange-400 font-medium group-hover:translate-x-2 transition-transform">
                  {t.readMore} <ArrowRight size={16} className="ml-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
