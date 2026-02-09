import React from 'react';
import { useParams } from 'react-router-dom';
import { Mail, Phone, Facebook, MapPin } from 'lucide-react';

const FestivalPage = () => {
  const { lang } = useParams();
  const currentLanguage = lang || 'ru';

  const content = {
    ru: {
      title: "VI Encuentro Universal de Ancianos",
      subtitle: "20 al 24 de Junio 2022",
      description: [
        "Por nuestra identidad ancestral y nuestra cultura ancestral.",
        "Se va a llevar a cabo del 20 al 24 de junio en el Centro de Desarrollo Integral Dos Mundos, Yurimaguas.",
        "Vamos a contar con la participación de ancianos de distintos pueblos, ciudades, y hasta estamos convocando sanadores de otros países. Ancianos que van a transmitir la sabiduría y compartir las vivencias.",
        "Estos 5 días serán muy nutridos de una actividades culturales y sociales permanentes, incluyendo procesos de sanacion contantes utilizando distintos métodos (cada anciano va a compartir su método).",
        "Va a ser muy nutrida y valiosísima para el aporte a esta nueva generación y a la transformación del planeta de estos últimos tiempos."
      ],
      masters: {
        title: "Ancianos-Maestros",
        list: [
          {
            name: "Luis Lancha",
            role: "Chamán Shawi",
            image: "https://static.wixstatic.com/media/7e97c8_dce5900fbaf9480698d7bb1fb7fba3f3~mv2.jpg/v1/fill/w_280,h_272,al_c,lg_1,q_80,enc_avif,quality_auto/288443207_410951567711096_860690846006933208_n_edited.jpg"
          },
          {
            name: "Roger Pizango",
            role: "Jeberos, Alto Amazonas",
            image: "https://static.wixstatic.com/media/7e97c8_2a1bfaefed3f4b9c9e97436a1bef15b4~mv2.jpg/v1/fill/w_395,h_384,al_c,lg_1,q_80,enc_avif,quality_auto/288465536_410951571044429_6852142950467618379_n_edited.jpg"
          },
          {
            name: "Mother Kogi Rumaldo Lozano Gil",
            role: "Guardian del sitio sagrado TEYUNA, en la Sierra Nevada de Santa Marta (Colombia)",
            image: "https://static.wixstatic.com/media/7e97c8_bcd2bfbf1772493a97b7623e77adb6cd~mv2.jpg/v1/fill/w_350,h_341,al_c,lg_1,q_80,enc_avif,quality_auto/safe_image_edited.jpg"
          },
          {
            name: "Wellington",
            role: "Huesero/Sobador",
            image: "https://static.wixstatic.com/media/7e97c8_af2b03433983499997a4618d317ff7fd~mv2.jpg/v1/fill/w_414,h_403,al_c,lg_1,q_80,enc_avif,quality_auto/287879551_410328627773390_6082651626267484171_n_edited.jpg"
          },
          {
            name: "Doña Asencia Sánchez",
            role: "Shipibo-Conibo",
            image: "https://static.wixstatic.com/media/7e97c8_862e2d0e6ddd41c3a64b833974ade932~mv2.jpg/v1/fill/w_469,h_456,al_c,lg_1,q_80,enc_avif,quality_auto/286236073_407320441407542_2575613744753019521_n_edited.jpg"
          },
          {
            name: "Marco Leoncio Mosquera Huatay",
            role: "Sacerdote Andino",
            image: "https://static.wixstatic.com/media/7e97c8_4ec87acdc0d6472e99a847a9f61ebbc8~mv2.jpg/v1/fill/w_557,h_542,al_c,lg_1,q_80,enc_avif,quality_auto/285860454_405854051554181_2750864275937047049_n_edited.jpg"
          }
        ]
      },
      contacts: {
        title: "Informes y reservas a:",
        whatsapp1: "+51 959 144 314",
        whatsapp2: "+51 993 332 946",
        facebook: "dosmundosperu",
        location: "Yurimaguas",
        locationUrl: "https://maps.app.goo.gl/Eybh4a3NFtGwp4A17"
      }
    },
    es: {
      title: "VI Encuentro Universal de Ancianos",
      subtitle: "20 al 24 de Junio 2022",
      description: [
        "Por nuestra identidad ancestral y nuestra cultura ancestral.",
        "Se va a llevar a cabo del 20 al 24 de junio en el Centro de Desarrollo Integral Dos Mundos, Yurimaguas.",
        "Vamos a contar con la participación de ancianos de distintos pueblos, ciudades, y hasta estamos convocando sanadores de otros países. Ancianos que van a transmitir la sabiduría y compartir las vivencias.",
        "Estos 5 días serán muy nutridos de una actividades culturales y sociales permanentes, incluyendo procesos de sanacion contantes utilizando distintos métodos (cada anciano va a compartir su método).",
        "Va a ser muy nutrida y valiosísima para el aporte a esta nueva generación y a la transformación del planeta de estos últimos tiempos."
      ],
      masters: {
        title: "Ancianos-Maestros",
        list: [
          {
            name: "Luis Lancha",
            role: "Chamán Shawi",
            image: "https://static.wixstatic.com/media/7e97c8_dce5900fbaf9480698d7bb1fb7fba3f3~mv2.jpg/v1/fill/w_280,h_272,al_c,lg_1,q_80,enc_avif,quality_auto/288443207_410951567711096_860690846006933208_n_edited.jpg"
          },
          {
            name: "Roger Pizango",
            role: "Jeberos, Alto Amazonas",
            image: "https://static.wixstatic.com/media/7e97c8_2a1bfaefed3f4b9c9e97436a1bef15b4~mv2.jpg/v1/fill/w_395,h_384,al_c,lg_1,q_80,enc_avif,quality_auto/288465536_410951571044429_6852142950467618379_n_edited.jpg"
          },
          {
            name: "Mother Kogi Rumaldo Lozano Gil",
            role: "Guardian del sitio sagrado TEYUNA, en la Sierra Nevada de Santa Marta (Colombia)",
            image: "https://static.wixstatic.com/media/7e97c8_bcd2bfbf1772493a97b7623e77adb6cd~mv2.jpg/v1/fill/w_350,h_341,al_c,lg_1,q_80,enc_avif,quality_auto/safe_image_edited.jpg"
          },
          {
            name: "Wellington",
            role: "Huesero/Sobador",
            image: "https://static.wixstatic.com/media/7e97c8_af2b03433983499997a4618d317ff7fd~mv2.jpg/v1/fill/w_414,h_403,al_c,lg_1,q_80,enc_avif,quality_auto/287879551_410328627773390_6082651626267484171_n_edited.jpg"
          },
          {
            name: "Doña Asencia Sánchez",
            role: "Shipibo-Conibo",
            image: "https://static.wixstatic.com/media/7e97c8_862e2d0e6ddd41c3a64b833974ade932~mv2.jpg/v1/fill/w_469,h_456,al_c,lg_1,q_80,enc_avif,quality_auto/286236073_407320441407542_2575613744753019521_n_edited.jpg"
          },
          {
            name: "Marco Leoncio Mosquera Huatay",
            role: "Sacerdote Andino",
            image: "https://static.wixstatic.com/media/7e97c8_4ec87acdc0d6472e99a847a9f61ebbc8~mv2.jpg/v1/fill/w_557,h_542,al_c,lg_1,q_80,enc_avif,quality_auto/285860454_405854051554181_2750864275937047049_n_edited.jpg"
          }
        ]
      },
      contacts: {
        title: "Informes y reservas a:",
        whatsapp1: "+51 959 144 314",
        whatsapp2: "+51 993 332 946",
        facebook: "dosmundosperu",
        location: "Yurimaguas",
        locationUrl: "https://maps.app.goo.gl/Eybh4a3NFtGwp4A17"
      }
    }
  };

  // Fallback to English or Russian if language not found, but for now default to RU if not ES
  const data = content[currentLanguage] || content['ru'];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Main Title */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
          {data.title}
        </h1>
        <p className="text-xl text-slate-400 mb-6">{data.subtitle}</p>
        
        <div className="mb-8">
          <img 
            src="https://static.wixstatic.com/media/7e97c8_d3c5ad07f0c64657a17db323120d67ec~mv2.jpg/v1/fill/w_960,h_425,al_c,q_85,enc_avif,quality_auto/7e97c8_d3c5ad07f0c64657a17db323120d67ec~mv2.jpg" 
            alt="Encuentro Banner" 
            className="w-full rounded-xl shadow-lg object-cover"
          />
        </div>

        <div className="prose prose-lg prose-invert mx-auto text-slate-300">
          {data.description.map((paragraph, idx) => (
            <p key={idx} className="mb-4 leading-relaxed text-justify">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Masters Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center border-b border-slate-800 pb-4">
          {data.masters.title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.masters.list.map((master, idx) => (
            <div key={idx} className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800 hover:border-slate-600 transition-all hover:scale-[1.02]">
              <div className="aspect-square overflow-hidden">
                <img 
                  src={master.image} 
                  alt={master.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 text-center">
                <h3 className="text-lg font-bold text-white mb-1">{master.name}</h3>
                <p className="text-sm text-slate-400">{master.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contacts Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700 text-center">
        <h2 className="text-3xl font-bold text-white mb-12">
          {data.contacts.title}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {/* WhatsApp 1 */}
          <a 
            href={`https://wa.me/${data.contacts.whatsapp1.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-green-500/50 hover:bg-green-500/10 transition-all"
          >
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all group-hover:scale-110">
              <Phone size={18} />
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 group-hover:text-green-400 transition-colors mb-1 font-medium">WhatsApp</div>
              <div className="text-xs text-slate-300 group-hover:text-slate-200 font-mono">{data.contacts.whatsapp1}</div>
            </div>
          </a>

          {/* WhatsApp 2 */}
          <a 
            href={`https://wa.me/${data.contacts.whatsapp2.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-green-500/50 hover:bg-green-500/10 transition-all"
          >
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400 group-hover:bg-green-500 group-hover:text-white transition-all group-hover:scale-110">
              <Phone size={18} />
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 group-hover:text-green-400 transition-colors mb-1 font-medium">WhatsApp</div>
              <div className="text-xs text-slate-300 group-hover:text-slate-200 font-mono">{data.contacts.whatsapp2}</div>
            </div>
          </a>

          {/* Location */}
          <a
            href={data.contacts.locationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
          >
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all group-hover:scale-110">
              <MapPin size={18} />
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 group-hover:text-blue-400 transition-colors mb-1 font-medium">Ubicación</div>
              <div className="text-xs text-slate-300 group-hover:text-slate-200">{data.contacts.location}</div>
            </div>
          </a>

          {/* Facebook */}
          <a 
            href={`https://facebook.com/${data.contacts.facebook}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-600/50 hover:bg-blue-600/10 transition-all"
          >
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all group-hover:scale-110">
              <Facebook size={18} />
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 group-hover:text-blue-400 transition-colors mb-1 font-medium">Facebook</div>
              <div className="text-xs text-slate-300 group-hover:text-slate-200">{data.contacts.facebook}</div>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
};

export default FestivalPage;
