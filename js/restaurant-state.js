/**
 * restaurant-state.js — المصدر المشترك لحالة المطعم.
 * الحالة اليدوية is_open تأتي من لوحة التحكم، وساعات العمل تحدد ما إذا
 * كان المتجر متاحاً فعلياً الآن. المنطقة الزمنية ثابتة على عُمان حتى لا
 * تتأثر حالة الموقع بمنطقة جهاز الزائر.
 */
const RestaurantState = (() => {
  const TIME_ZONE = 'Asia/Muscat';

  function omanHour(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    return Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  }

  function normaliseHour(value, fallback) {
    const hour = Number(value);
    return Number.isInteger(hour) && hour >= 0 && hour <= 24 ? hour : fallback;
  }

  function isWithinBusinessHours(settings, date = new Date()) {
    const openHour = normaliseHour(settings?.open_hour, 0);
    const closeHour = normaliseHour(settings?.close_hour, 24);
    const hour = omanHour(date);

    // نفس وقت الفتح والإغلاق يعني فتحاً على مدار 24 ساعة.
    if (openHour === closeHour) return true;
    // فترة عادية، مثل 12:00–24:00.
    if (openHour < closeHour) return hour >= openHour && hour < closeHour;
    // فترة تعبر منتصف الليل، مثل 12:00–02:00.
    return hour >= openHour || hour < closeHour;
  }

  function isOpen(settings, date = new Date()) {
    return Boolean(settings?.is_open) && isWithinBusinessHours(settings, date);
  }

  function status(settings, date = new Date()) {
    if (!settings?.is_open) return { isOpen: false, reason: 'manual' };
    if (!isWithinBusinessHours(settings, date)) return { isOpen: false, reason: 'hours' };
    return { isOpen: true, reason: 'open' };
  }

  return { TIME_ZONE, omanHour, isWithinBusinessHours, isOpen, status };
})();
