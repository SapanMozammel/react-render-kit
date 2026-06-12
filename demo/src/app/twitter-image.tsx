import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'react-render-kit — React Render Observability SDK';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

const TwitterImage = () =>
	new ImageResponse(
		(
			<div
				style={{
					background: '#111111',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					justifyContent: 'center',
					padding: '72px 96px',
					fontFamily: 'sans-serif',
				}}
			>
				{/* Icon mark */}
				<div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '22px', background: '#1a3a6a', marginBottom: '40px', display: 'flex' }}>
					<div style={{ position: 'absolute', left: '11px', top: '20px', width: '29px', height: '9px', borderRadius: '5px', background: '#5a9cf8' }} />
					<div style={{ position: 'absolute', left: '18px', top: '35px', width: '40px', height: '9px', borderRadius: '5px', background: '#4ade80' }} />
					<div style={{ position: 'absolute', left: '25px', top: '51px', width: '22px', height: '9px', borderRadius: '5px', background: 'rgba(90, 156, 248, 0.6)' }} />
				</div>

				{/* Title */}
				<div
					style={{
						fontSize: '76px',
						fontWeight: 800,
						color: '#ededed',
						lineHeight: 1.05,
						letterSpacing: '-0.03em',
						marginBottom: '20px',
					}}
				>
					react-render-kit
				</div>

				{/* Subtitle */}
				<div
					style={{
						fontSize: '26px',
						color: '#888888',
					}}
				>
					React Render Observability SDK — 12 dev-only packages
				</div>
			</div>
		),
		{ ...size },
	);

export default TwitterImage;
