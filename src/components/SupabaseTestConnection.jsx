import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SupabaseTestConnection = () => {
  const [status, setStatus] = useState('Проверка подключения...');
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🧪 [Test] Тестирование подключения к Supabase...');
        
        // Тест 1: Простой запрос к таблице episodes (только несколько полей)
        const { data, error, count } = await supabase
          .from('episodes')
          .select('id, title, lang, date', { count: 'exact' })
          .limit(10);

        console.log('🧪 [Test] Результат запроса:', { 
          data, 
          error, 
          count,
          dataLength: data?.length 
        });

        if (error) {
          console.error('🧪 [Test] Ошибка запроса:', error);
          setError(error.message);
          setStatus(`❌ Ошибка: ${error.message}`);
          return;
        }

        if (!data || data.length === 0) {
          setStatus('⚠️ Подключение работает, но таблица episodes пуста');
          console.warn('🧪 [Test] Таблица episodes пуста!');
          return;
        }

        setEpisodes(data);
        setStatus(`✅ Подключение работает! Найдено ${data.length} эпизодов`);
        console.log('🧪 [Test] Успешно загружено эпизодов:', data.length);
        console.log('🧪 [Test] Первые 3 эпизода:', data.slice(0, 3));

      } catch (err) {
        console.error('🧪 [Test] Критическая ошибка:', err);
        setError(err.message);
        setStatus(`❌ Критическая ошибка: ${err.message}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '400px',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
        Тест подключения Supabase
      </h3>
      <p style={{ margin: '0 0 10px 0' }}>{status}</p>
      
      {error && (
        <div style={{ 
          backgroundColor: '#7f1d1d', 
          padding: '10px', 
          borderRadius: '4px',
          marginTop: '10px',
          fontSize: '12px'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}
      
      {episodes.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <strong>Первые 3 эпизода:</strong>
          <ul style={{ margin: '5px 0', padding: '0 0 0 20px', fontSize: '12px' }}>
            {episodes.slice(0, 3).map((ep, idx) => (
              <li key={idx} style={{ marginBottom: '5px' }}>
                {ep.title || ep.slug} ({ep.lang})
              </li>
            ))}
          </ul>
        </div>
      )}

      <button 
        onClick={() => window.location.reload()} 
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Обновить страницу
      </button>
    </div>
  );
};

export default SupabaseTestConnection;

