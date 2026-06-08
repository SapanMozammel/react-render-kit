import { useState } from 'react';
import { useWhyDidYouRender } from 'why-render';

interface User {
	id: number;
	name: string;
}

interface ProfileProps {
	value: number;
	user: User;
	onClick: () => void;
}

function Profile(props: ProfileProps) {
	useWhyDidYouRender('Profile', props);
	return (
		<div onClick={props.onClick}>
			{props.user.name}: {props.value}
		</div>
	);
}

export default function App() {
	const [count, setCount] = useState(0);

	// `user` is a new object every render → triggers "reference changed"
	// `onClick` is a new function every render → triggers "reference changed"
	// `count` change → triggers "value-changed: N → N+1"
	return (
		<>
			<Profile value={count} user={{ id: 1, name: 'Ada' }} onClick={() => setCount((c) => c + 1)} />
			<button onClick={() => setCount((c) => c + 1)}>increment</button>
		</>
	);
}
