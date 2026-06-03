import { Link } from 'react-router-dom'

function ControlLink({ id }) {
  return (
    <Link
      to={`/controls/${encodeURIComponent(id)}`}
      onClick={(e) => e.stopPropagation()}
    >
      {id}
    </Link>
  )
}

export default ControlLink
