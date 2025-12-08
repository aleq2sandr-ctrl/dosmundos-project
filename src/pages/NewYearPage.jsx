import React from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Mail, Phone, Facebook } from 'lucide-react';

const NewYearPage = () => {
  const { lang } = useParams();
  const currentLanguage = lang || 'ru';

  const content = {
    ru: {
      title: "Священная Церемония Очищения",
      subtitle: "31 декабря - 3 января 2025",
      description: [
        "Природа по божественному замыслу сохраняет в неприкосновенности древнюю мудрость — богатство, которое мы забыли под разрушительным влиянием мира, в котором живем. В этом смысле Центр Интегрального Развития 'Dos Mundos' спасает, переоценивает эти знания и распространяет их по всему миру. Так, в этот раз он стремится приблизить нас и ввести в мир физио-энергетического очищения через прием растений, очистительные ванны, соединение и синхронизацию с различными элементами, достигая гармонизации и выравнивания чакр или энергетических центров, которые жизненно важны для функционирования и равновесия всего нашего существования.",
        "CDI 'Dos Mundos' представляет и предлагает вам Ванны Цветения (Baños de Florecimiento) как очистительные и обновляющие ванны с использованием различных амазонских, андских и прибрежных растений, которые помогают благополучию человека. Эти ванны имеют процесс приготовления, как это делали наши предки в различных событиях.",
        "В настоящее время, благодаря Вселенной, достигаются вдохновляющие результаты, за которые мы благодарны каждому из вас за то, что позволили нам быть частью вашего продвижения и трансформации."
      ],
      eventDetails: {
        invitation: "31 декабря, 1, 2, 3... января 2025 года, вы сердечно приглашаетесь принять участие в СВЯЩЕННОЙ ЦЕРЕМОНИИ ОЧИЩЕНИЯ с 5 элементами (Ванны Цветения), которая пройдет на 19 км дороги Юримагуас - Тарапото.",
        includes: {
          title: "ВКЛЮЧАЕТ",
          items: [
            "2 очистительные ванны (с растениями и солью)",
            "3 гармонизирующие ванны (с цветами, кристаллами и святой водой)",
            "Окуривание (Sahumada)"
          ]
        },
        pricing: {
          title: "ЦЕНЫ",
          items: [
            "Цена ванн: S/. 200.00",
            "ПРОМОАКЦИЯ: Ванны S/. 200.00 + Аяуаска S/. 150.00 = S/. 350.00"
          ]
        }
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
      title: "Ceremonia Sagrada de Purificación",
      subtitle: "31 de diciembre - 3 de enero del 2025",
      description: [
        "La naturaleza por creación divina, mantiene intacta la sabiduría ancestral, riqueza que hemos olvidado por la influencia desgarradora del mundo en el que vivimos. En este sentido, el Centro de Desarrollo Integral \"Dos Mundos\" rescata, revalora estos conocimientos y los difunde por el mundo entero. Es así, que en esta oportunidad busca acercarnos e introducirnos al mundo de la depuración Fisio energética a través de la ingesta de plantas, baños depurativos, conexión y sincronización con diversos elementos, logrando armonizar y alinear los chacras o centros energéticos, los cuales son vitales para el funcionamiento y equilibrio de toda nuestra existencia.",
        "El CDI \"Dos Mundos\", les presenta y ofrece los Baños de florecimiento, como baños depurativos y renovadores a través de las distintas plantas amazónicas, andinas y costeñas que ayudan al bienestar del hombre. Estos baños tienen un proceso de preparación como lo hacían nuestros antepasados en distintos eventos.",
        "Actualmente, gracias al Universo, se viene logrando resultados inspiradores de los cuales estamos agradecidos con cada uno de ustedes por permitirnos ser parte de su avance y transformación."
      ],
      eventDetails: {
        invitation: "Este 31, 1, 2, 3… de enero del 2025, están cordialmente invitados a participar en la CEREMONIA SAGRADA DE PURIFICACIÓN con 5 elementos (Baños de Florecimiento) que se desarrollará en el km 19 carretera Yurimaguas - Tarapoto.",
        includes: {
          title: "INCLUYE",
          items: [
            "2 baños purificativos (con plantas y sal)",
            "3 baños armonizantes (con flores, cristales y agua bendita)",
            "Sahumada"
          ]
        },
        pricing: {
          title: "PRECIOS",
          items: [
            "Precio de Baños: S/. 200.00",
            "PROMOCIÓN: Baños S/. 200.00 + Ayahuasca S/. 150.00 = S/. 350.00"
          ]
        }
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
      title: "Sacred Purification Ceremony",
      subtitle: "December 31 - January 3, 2025",
      description: [
        "Nature, by divine creation, keeps ancestral wisdom intact, a wealth we have forgotten due to the heartbreaking influence of the world we live in. In this sense, the Integral Development Center 'Dos Mundos' rescues, revalues these knowledges and spreads them throughout the world. Thus, on this opportunity, it seeks to bring us closer and introduce us to the world of Physio-energetic purification through the ingestion of plants, purifying baths, connection and synchronization with various elements, achieving harmony and alignment of the chakras or energy centers, which are vital for the functioning and balance of our entire existence.",
        "The CDI 'Dos Mundos' presents and offers you Flowering Baths, as purifying and renewing baths through the different Amazonian, Andean and coastal plants that help man's well-being. These baths have a preparation process as our ancestors did in different events.",
        "Currently, thanks to the Universe, inspiring results are being achieved for which we are grateful to each of you for allowing us to be part of your progress and transformation."
      ],
      eventDetails: {
        invitation: "This December 31st, January 1st, 2nd, 3rd... 2025, you are cordially invited to participate in the SACRED PURIFICATION CEREMONY with 5 elements (Flowering Baths) which will take place at km 19 Yurimaguas - Tarapoto road.",
        includes: {
          title: "INCLUDES",
          items: [
            "2 purifying baths (with plants and salt)",
            "3 harmonizing baths (with flowers, crystals and holy water)",
            "Smudging (Sahumada)"
          ]
        },
        pricing: {
          title: "PRICING",
          items: [
            "Baths Price: S/. 200.00",
            "PROMOTION: Baths S/. 200.00 + Ayahuasca S/. 150.00 = S/. 350.00"
          ]
        }
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

          {/* Event Details */}
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/5 space-y-8">
            <p className="text-lg text-slate-300 font-medium">{t.eventDetails.invitation}</p>
            
            {/* Includes */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 text-orange-400">{t.eventDetails.includes.title}</h3>
              <ul className="space-y-3">
                {t.eventDetails.includes.items.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="w-1.5 h-1.5 mt-2.5 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 text-orange-400">{t.eventDetails.pricing.title}</h3>
              <ul className="space-y-3">
                {t.eventDetails.pricing.items.map((item, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="w-1.5 h-1.5 mt-2.5 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-slate-300 font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
