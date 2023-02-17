import { Signal, useSignal } from '@preact/signals'
import { persist, useAuthHelper } from '../../lib/auth-helper'
import { usePopupCloseClick } from '../../lib/popup-close-click'
import type { PersistenceState } from '../../lib/state'
import Button from '../design-system/button'
import Input from '../design-system/input'
import LinkButton from '../design-system/link-button'
import popupStyles from './navbar-popup.module.css'

interface SavePromptProps {
	loggedIn: 'full' | 'partial' | 'none'
	persistenceState: Signal<PersistenceState>
	onClose: () => void
}

export default function SavePrompt(props: SavePromptProps) {
	const auth = useAuthHelper(props.loggedIn === 'none' ? 'EMAIL_ENTRY' : 'LOGGED_IN')
	const ghostStage = useSignal(false)

	usePopupCloseClick(popupStyles.popup!, props.onClose)

	let content
	if (ghostStage.value || auth.stage.value === 'LOGGED_IN') {
		content = (<>
			<p>
				Your work is {props.persistenceState.value.kind === 'PERSISTED' && props.persistenceState.value.cloudSaveState === 'SAVED' ? 'saved' : 'saving'} to the cloud
				{props.loggedIn === 'full' ? '.' : ' and you have been emailed a link to access it!'}
			</p>
			<Button accent onClick={() => props.onClose()}>Done</Button>
		</>)
	} else if (auth.stage.value === 'EMAIL') {
		content = (
			<form onSubmit={async (event) => {
				event.preventDefault()
				await auth.submitEmail()
				persist(props.persistenceState, auth.email.value)
				if (auth.state.value === 'EMAIL_INCORRECT') ghostStage.value = true
			}}>
				<p>Enter your email to save your work, we'll send you a link for later:</p>
				<div class={popupStyles.inputRow}>
					<Input type='email' autoComplete='email' placeholder='fiona@hackclub.com' bind={auth.email} />
					<Button accent type='submit' disabled={!auth.emailValid.value} loading={auth.isLoading.value}>
						Next
					</Button>
				</div>
			</form>
		)
	} else if (auth.stage.value === 'CODE') {
		content = (
			<form onSubmit={async (event) => {
				event.preventDefault()
				await auth.submitCode()
				if (auth.state.value === 'LOGGED_IN') {
					ghostStage.value = true
					props.persistenceState.subscribe(() => {
						if (props.persistenceState.value.kind === 'PERSISTED' && props.persistenceState.value.cloudSaveState === 'SAVED')
							window.location.reload()
					})
				}
			}}>
				<p>Welcome back to Sprig! Enter the code we just emailed you:</p>
				<div class={popupStyles.inputRow}>
					<Input type='text' maxLength={6} placeholder='123456' bind={auth.code} />
					<Button accent type='submit' disabled={!auth.codeValid.value} loading={auth.isLoading.value}>
						Log in
					</Button>
				</div>
				{auth.state.value === 'CODE_INCORRECT' && <p class={popupStyles.error}>Incorrect login code.</p>}

				<p class={popupStyles.muted}>
					Can't log in right now?{' '}
					<LinkButton
						onClick={() => ghostStage.value = true}
						disabled={auth.isLoading.value}
					>
						Skip and just get coding
					</LinkButton>
				</p>
			</form>
		)
	}
	
	return (
		<div class={popupStyles.popup}>
			{content}
		</div>
	)
}