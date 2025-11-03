import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Beta Code Service
 * Manages single-use beta access codes in Firestore
 */
class BetaCodeService {
  /**
   * Check if a beta code is valid and unused
   */
  async validateCode(code) {
    try {
      const codeUpper = code.toUpperCase().trim();
      const docRef = doc(db, 'betaCodes', codeUpper);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          valid: false,
          error: 'Invalid beta code. Please check your code and try again.'
        };
      }

      const data = docSnap.data();

      if (data.used) {
        return {
          valid: false,
          error: 'This beta code has already been used.'
        };
      }

      return {
        valid: true,
        code: codeUpper
      };
    } catch (error) {
      console.error('Error validating beta code:', error);
      return {
        valid: false,
        error: 'Error validating code. Please try again.'
      };
    }
  }

  /**
   * Mark a beta code as used
   */
  async markCodeAsUsed(code, userEmail) {
    try {
      const codeUpper = code.toUpperCase().trim();
      const docRef = doc(db, 'betaCodes', codeUpper);

      await updateDoc(docRef, {
        used: true,
        usedBy: userEmail,
        usedAt: serverTimestamp()
      });

      console.log(`✅ Beta code ${codeUpper} marked as used by ${userEmail}`);
      return { success: true };
    } catch (error) {
      console.error('Error marking code as used:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new BetaCodeService();
