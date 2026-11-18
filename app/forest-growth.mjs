export const treeMinutes = 120;
export const forestLevelMax = 15;
const minuteMs = 60_000;

export function forestProgress(bookings, now=Date.now()) {
  let parkedMs=0;
  let activeBooking;
  for (const booking of bookings) {
    if (!Number.isFinite(booking.started)) continue;
    if (booking.status==='active') activeBooking=booking;
    const end=booking.status==='active' ? now+(booking.fastForwardMs??0) : booking.ended;
    if (!['active','ended'].includes(booking.status) || !Number.isFinite(end)) continue;
    parkedMs+=Math.max(0,end-booking.started);
  }
  const minutes=Math.floor(parkedMs/minuteMs);
  const trees=Math.min(forestLevelMax,Math.floor(minutes/treeMinutes));
  const full=trees===forestLevelMax;
  const grown=minutes%treeMinutes;
  return {
    minutes,
    trees,
    progress:full?100:Math.floor(grown*100/treeMinutes),
    minutesToNext:full?0:treeMinutes-grown,
    active:Boolean(activeBooking),
    vehicle:activeBooking?.vehicle ?? 'car'
  };
}
