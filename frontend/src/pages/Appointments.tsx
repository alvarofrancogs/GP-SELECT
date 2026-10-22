import { InteriorPageHeader } from '../components/InteriorPageHeader';
import { AppointmentForm } from '../components/AppointmentForm';
import { useLanguage } from '../i18n/useLanguage';
import '../styles/interiors.css';

/** Citas: a short page, a few lines on what an appointment is for and the request form. */
export function Appointments() {
  const { copy } = useLanguage();
  const text = copy.interiors.appointments;

  return <article className="interior-page appointments-page">
    <InteriorPageHeader {...text} />
    <div className="appointments-content">
      <ul className="appointments-points">
        {text.points.map((point) => <li key={point.title}>
          <p className="type-heading">{point.title}</p>
          <p className="type-body">{point.body}</p>
        </li>)}
      </ul>
      <AppointmentForm />
    </div>
  </article>;
}
