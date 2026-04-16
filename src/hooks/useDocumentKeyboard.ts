import { useEffect } from 'react';
import { KEYMAP, isTypingTarget } from '../keyboard/keymap';

type Props = {
    onNew?: () => void;
    onSave?: () => void;
    onPost?: () => void;
    onClose?: () => void;
    disabled?: boolean;
};

export function useDocumentKeyboard({
    onNew, onSave, onPost, onClose, disabled
}: Props) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (disabled) return;

            const key = e.key;

            if (key === KEYMAP.NEW_DOC && onNew) {
                e.preventDefault();
                onNew();
                return;
            }
            if (key === KEYMAP.SAVE_DOC && onSave) {
                e.preventDefault();
                onSave();
                return;
            }
            if (key === KEYMAP.POST_DOC && onPost) {
                e.preventDefault();
                onPost();
                return;
            }
            if (key === KEYMAP.CLOSE && onClose) {
                // Esc: غالباً نسمح به حتى لو يكتب
                e.preventDefault();
                onClose();
                return;
            }
        };

        window.addEventListener('keydown', handler, true); // capture = true
        return () => window.removeEventListener('keydown', handler, true);
    }, [onNew, onSave, onPost, onClose, disabled]);
}
