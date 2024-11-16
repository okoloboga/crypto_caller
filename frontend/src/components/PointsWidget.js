import React, { useEffect, useState } from 'react';
import { fetchUserPoints } from '../services/apiService';
import './PointsWidget.css';

const PointsWidget = () => {
  const [points, setPoints] = useState(0); // Очки
  const [loading, setLoading] = useState(false); // Загрузка
  const [error, setError] = useState(null); // Ошибки
  const [lastUpdated, setLastUpdated] = useState(null); // Время последнего обновления

  // Функция для загрузки очков
  const loadPoints = async () => {
    setLoading(true);
    setError(null); // Сбрасываем ошибки перед новой загрузкой
    try {
      const userPoints = await fetchUserPoints();
      setPoints(userPoints);
      setLastUpdated(new Date()); // Устанавливаем текущее время как время обновления
    } catch (err) {
      console.error('Ошибка при загрузке очков:', err);
      setError('Не удалось загрузить очки. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Первичная загрузка очков при монтировании компонента
  useEffect(() => {
    loadPoints();
    const interval = setInterval(loadPoints, 60000); // Автоматическое обновление каждые 60 секунд
    return () => clearInterval(interval); // Очищаем интервал при размонтировании
  }, []);

  // Обработка кнопки "Обновить"
  const handleRefresh = () => {
    loadPoints();
  };

  return (
    <div className="points-widget">
      {loading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <>
          <h3>Ваши накопленные очки: {points}</h3>
          {lastUpdated && (
            <p>Последнее обновление: {lastUpdated.toLocaleTimeString()}</p>
          )}
          <button onClick={handleRefresh}>Обновить очки</button>
        </>
      )}
    </div>
  );
};

export default PointsWidget;
