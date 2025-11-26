import React from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Mail, Phone, Facebook } from 'lucide-react';

const NewYearPage = () => {
  const { lang } = useParams();
  const currentLanguage = lang || 'ru';

  const content = {
    ru: {
      title: "Новый год в джунглях",
      subtitle: "31 декабря - 7 января",
      description: [
        "Приглашаем вас встретить Новый год в сердце Амазонии, в центре Dos Mundos.",
        "Это уникальная возможность начать год с очищения, обновления и глубокого погружения в себя и природу.",
        "Программа включает в себя традиционные церемонии, медитации, прогулки по джунглям и общение с мастерами.",
        "Мы создадим пространство для трансформации и наполнения новой энергией на весь предстоящий год."
      ],
      schedule: {
        title: "Программа",
        items: [
          "31 декабря: Прибытие, размещение, праздничный ужин и церемония перехода.",
          "1-6 января: Ежедневные практики, церемонии, интеграция опыта.",
          "7 января: Завершение программы, отъезд."
        ]
      },
      contacts: {
        title: "Бронирование и вопросы:",
        email: "pepemariadosmundos@gmail.com",
        whatsapp1: "+51 959 144 314",
        whatsapp2: "+51 993 332 946",
        facebook: "dosmundosperu"
      }
    },
    es: {
      title: "Año Nuevo en la Selva",
      subtitle: "31 de diciembre - 7 de enero",
      description: [
        "Te invitamos a recibir el Año Nuevo en el corazón de la Amazonía, en el centro Dos Mundos.",
        "Es una oportunidad única para comenzar el año con purificación, renovación y una profunda inmersión en uno mismo y la naturaleza.",
        "El programa incluye ceremonias tradicionales, meditaciones, caminatas por la selva y compartir con los maestros.",
        "Crearemos un espacio para la transformación y recarga de nueva energía para todo el año venidero."
      ],
      schedule: {
        title: "Programa",
        items: [
          "31 de diciembre: Llegada, alojamiento, cena festiva y ceremonia de transición.",
          "1-6 de enero: Prácticas diarias, ceremonias, integración de la experiencia.",
          "7 de enero: Cierre del programa, partida."
        ]
      },
      contacts: {
        title: "Reservas y consultas:",
        email: "pepemariadosmundos@gmail.com",
        whatsapp1: "+51 959 144 314",
        whatsapp2: "+51 993 332 946",
        facebook: "dosmundosperu"
      }
    },
    en: {
      title: "New Year in the Jungle",
      subtitle: "December 31 - January 7",
      description: [
        "We invite you to celebrate New Year in the heart of the Amazon, at the Dos Mundos center.",
        "This is a unique opportunity to start the year with purification, renewal, and deep immersion in yourself and nature.",
        "The program includes traditional ceremonies, meditations, jungle walks, and sharing with masters.",
        "We will create a space for transformation and recharging with new energy for the entire coming year."
      ],
      schedule: {
        title: "Program",
        items: [
          "December 31: Arrival, accommodation, festive dinner, and transition ceremony.",
          "January 1-6: Daily practices, ceremonies, integration of experience.",
          "January 7: Program closing, departure."
        ]
      },
      contacts: {
        title: "Booking and inquiries:",
        email: "pepemariadosmundos@gmail.com",
        whatsapp1: "+51 959 144 314",
        whatsapp2: "+51 993 332 946",
        facebook: "dosmundosperu"
      }
    }
  };

  const t = content[currentLanguage] || content.en;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
            {t.title}
          </h1>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-xl text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="text-orange-400" />
              <span>{t.subtitle}</span>
            </div>
            <div className="hidden md:block text-slate-600">•</div>
            <div className="flex items-center gap-2">
              <MapPin className="text-orange-400" />
              <span>Dos Mundos, Yurimaguas</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Description */}
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/5">
            <div className="space-y-4 text-lg leading-relaxed text-slate-300">
              {t.description.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6">{t.schedule.title}</h2>
            <ul className="space-y-4">
              {t.schedule.items.map((item, index) => (
                <li key={index} className="flex gap-4">
                  <div className="w-2 h-2 mt-2.5 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div className="bg-gradient-to-br from-orange-900/20 to-slate-900 rounded-2xl p-8 border border-orange-500/20">
            <h2 className="text-2xl font-bold text-white mb-6">{t.contacts.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a 
                href={`mailto:${t.contacts.email}`}
                className="flex items-center gap-3 text-slate-300 hover:text-orange-400 transition-colors"
              >
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Mail size={20} />
                </div>
                <span>{t.contacts.email}</span>
              </a>
              
              <a 
                href={`https://wa.me/${t.contacts.whatsapp1.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-orange-400 transition-colors"
              >
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Phone size={20} />
                </div>
                <span>{t.contacts.whatsapp1}</span>
              </a>

              <a 
                href={`https://wa.me/${t.contacts.whatsapp2.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-orange-400 transition-colors"
              >
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Phone size={20} />
                </div>
                <span>{t.contacts.whatsapp2}</span>
              </a>

              <a 
                href={`https://facebook.com/${t.contacts.facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-slate-300 hover:text-orange-400 transition-colors"
              >
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Facebook size={20} />
                </div>
                <span>{t.contacts.facebook}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewYearPage;
