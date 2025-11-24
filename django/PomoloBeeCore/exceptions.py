from rest_framework.exceptions import APIException
 



class CustomAPIException(APIException):
    status_code = 500
    default_code = "500_INTERNAL_ERROR"
    default_detail = "Internal server error"

    def __init__(self, detail=None, code=None, status_code=None):
        self.status_code = status_code or self.status_code
        self.detail = {
            "error": {
                "code": code or self.default_code,
                "message": detail or self.default_detail
            }
        }


class APIError(APIException):
    def __init__(self, code, message, status_code=400):
        self.status_code = status_code
        self.detail = {
            "error": {
                "code": code,
                "message": message
            }
        }


class NotFoundError(CustomAPIException):
    status_code = 404
    default_code = "404_NOT_FOUND"
    default_detail = "Resource not found."


class BadRequestError(CustomAPIException):
    status_code = 400
    default_code = "400_BAD_REQUEST"
    default_detail = "Invalid input."


class MLUnavailableError(APIException):
    status_code = 503
    default_code = "ML_UNAVAILABLE"
    default_detail = "ML service unavailable"

    def __init__(self, detail=None, image_id=None):
        message = detail or self.default_detail
        self.detail = {
            "error": {
                "code": self.default_code,
                "message": message,
                "image_id": image_id
            }
        }
