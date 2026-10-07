def clean_string(value):

    if value is None:
        return None

    return value.strip()


def is_valid_email(email):

    if not email:
        return False

    return "@" in email and "." in email.split("@")[-1]