/**
 * جریان پرداخت فرضی نوبتینو (P07)
 *
 * کمکی‌های مشترک برای درگاه پرداخت و صفحه‌های نتیجه.
 * این جریان فقط برای نمایش تجربه است؛ در محیط واقعی تأیید پرداخت از وب‌سرویس درگاه می‌آید.
 */
const PaymentFlow = {
	GATEWAY: 'P07-payment-gateway.html',
	SUCCESS: 'P07-payment-success.html',
	FAILURE: 'P07-payment-failure.html',

	/** دادهٔ نمونه وقتی صفحه بدون رزرو باز شود. */
	DEMO_RESERVATION: {
		id: 'RES-DEMO',
		doctorId: 'doctor-001',
		appointmentDate: '2026-12-05',
		startTime: '10:00',
		consultationFee: 250000
	},

	/** خواندن رزرو از آدرس صفحه؛ در نبودِ آن از دادهٔ نمونه استفاده می‌شود. */
	getReservation() {
		const params = new URLSearchParams(location.search);
		const id = params.get('reservation');
		let reservation = null;
		let demo = false;

		if (id && typeof ReservationSystem !== 'undefined') {
			reservation = ReservationSystem.getReservation(id);
		}
		if (!reservation) {
			reservation = Object.assign({}, this.DEMO_RESERVATION);
			demo = true;
		}
		return { reservation, demo };
	},

	/** ساخت لینک یک صفحهٔ جریان با نگه‌داشتن شناسهٔ رزرو. */
	url(pageName, reservationId) {
		const id = reservationId || new URLSearchParams(location.search).get('reservation');
		return `${pageName}?reservation=${encodeURIComponent(id)}`;
	},

	/** خلاصهٔ قابل نمایش رزرو: پزشک، زمان و مبلغ. */
	describe(reservation) {
		const doctor = typeof getDoctorById === 'function' ? getDoctorById(reservation.doctorId) : null;
		const [year, month, day] = reservation.appointmentDate.split('-').map(Number);
		let dateText = reservation.appointmentDate;
		try {
			dateText = new Date(year, month - 1, day).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
		} catch (err) { /* تقویم فارسی در دسترس نیست؛ تاریخ خام نمایش داده می‌شود */ }
		const timeText = String(reservation.startTime).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
		const amount = Number(reservation.consultationFee) || 0;
		const amountText = (doctor ? doctor.consultationFee : amount.toLocaleString('fa-IR') + ' تومان');

		return {
			doctorName: doctor ? doctor.name : 'پزشک',
			specialty: doctor ? doctor.specialty : '',
			dateText,
			timeText,
			amount,
			amountText
		};
	},

	/** ساخت کد پیگیری یکتا برای تراکنش فرضی. */
	createTransactionId() {
		return 'TX-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
	},

	/** درج مقدار متنی در عنصر، در صورت وجود عنصر. */
	fill(id, value) {
		const el = document.getElementById(id);
		if (el) el.textContent = value;
	}
};
