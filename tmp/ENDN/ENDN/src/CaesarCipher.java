import javax.swing.JOptionPane;

public class CaesarCipher {

    public static String encrypt(String text, int key) {
        key = ((key % 26) + 26) % 26; // normalize

        StringBuilder result = new StringBuilder();

        for (char ch : text.toCharArray()) {
            if (Character.isUpperCase(ch)) {
                char base = 'A';
                int pos = ch - base;
                int newPos = (pos + key) % 26;
                result.append((char) (base + newPos));
            } else if (Character.isLowerCase(ch)) {
                char base = 'a';
                int pos = ch - base;
                int newPos = (pos + key) % 26;
                result.append((char) (base + newPos));
            } else {
                result.append(ch); // numbers, symbols, spaces unchanged
            }
        }
        return result.toString();
    }

    public static String decrypt(String text, int key) {
        key = ((key % 26) + 26) % 26; // normalize

        StringBuilder result = new StringBuilder();

        for (char ch : text.toCharArray()) {
            if (Character.isUpperCase(ch)) {
                char base = 'A';
                int pos = ch - base;
                int newPos = (pos - key + 26) % 26;
                result.append((char) (base + newPos));
            } else if (Character.isLowerCase(ch)) {
                char base = 'a';
                int pos = ch - base;
                int newPos = (pos - key + 26) % 26;
                result.append((char) (base + newPos));
            } else {
                result.append(ch);
            }
        }
        return result.toString();
    }

    public static void main(String[] args) {

        while (true) {
            String[] options = {"Encrypt", "Decrypt", "Exit"};

            int choice = JOptionPane.showOptionDialog(
                    null,
                    "Choose an option:",
                    "Caesar Cipher Menu",
                    JOptionPane.DEFAULT_OPTION,
                    JOptionPane.INFORMATION_MESSAGE,
                    null,
                    options,
                    options[0]
            );

            if (choice == 0) {
                String text = JOptionPane.showInputDialog("Enter text to encrypt:");
                if (text == null) continue;

                int key;
                try {
                    String keyStr = JOptionPane.showInputDialog("Enter encryption key (any integer):");
                    if (keyStr == null) continue;
                    key = Integer.parseInt(keyStr.trim());
                } catch (Exception e) {
                    JOptionPane.showMessageDialog(null, "Invalid key. Please enter an integer number.");
                    continue;
                }

                String encrypted = encrypt(text, key);
                JOptionPane.showMessageDialog(null, "Encrypted Text:\n" + encrypted);

            } else if (choice == 1) {
                String text = JOptionPane.showInputDialog("Enter text to decrypt:");
                if (text == null) continue;

                int key;
                try {
                    String keyStr = JOptionPane.showInputDialog("Enter decryption key (any integer):");
                    if (keyStr == null) continue;
                    key = Integer.parseInt(keyStr.trim());
                } catch (Exception e) {
                    JOptionPane.showMessageDialog(null, "Invalid key. Please enter an integer number.");
                    continue;
                }

                String decrypted = decrypt(text, key);
                JOptionPane.showMessageDialog(null, "Decrypted Text:\n" + decrypted);

            } else {
                JOptionPane.showMessageDialog(null, "Goodbye!");
                break;
            }
        }
    }
}