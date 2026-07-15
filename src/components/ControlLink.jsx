import { Link } from 'react-router-dom'

function ControlLink({ id, className }) {
  return (
    <Link
      to={`/controls/${encodeURIComponent(id)}`}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {id}
    </Link>
  )
}

export default ControlLink
