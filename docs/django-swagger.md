## Use Swagger to generate Django API doc (in docker)




### Overview

This project already has **drf-spectacular** installed and configured.

Once the server is up and running, you can access the generated API documentation:

   * **Swagger UI** (interactive browser view):

     * [https://beelab-api.nathabee.de//api/docs/](https://beelab-api.nathabee.de//api/docs/)

     This page provides a **live interface** for testing the API, displaying all available endpoints, HTTP methods, and response schemas grouped by app (e.g., **PomoloBee**, **Competence**, **User**).

   * **OpenAPI Schema** (downloadable YAML file):

     * [https://beelab-api.nathabee.de//api/schema/](https://beelab-api.nathabee.de//api/schema/)

     This endpoint allows you to **download the schema** in YAML format, which can be used with other tools or for documentation purposes.

---

 
### **Regenerating the Documentation**

Whenever you modify views, serializers, or any other parts of your API, you can regenerate the documentation by running the following command:

```bash
docker-compose exec django python manage.py spectacular --file schema.yaml
```

This will regenerate the **schema.yaml** file based on the latest code in your project.

---

### **Useful Links**:

* **Swagger UI**: [https://beelab-api.nathabee.de//api/docs/](https://beelab-api.nathabee.de//api/docs/)
* **Download OpenAPI schema**: [https://beelab-api.nathabee.de//api/schema/](https://beelab-api.nathabee.de//api/schema/)

By following these steps, you will have a **dynamic API documentation** that's always in sync with your Django project, helping both developers and users to easily understand and interact with the APIs.


### Error handling 


### **Handling Warnings and Errors During Schema Generation**

When generating the schema, you may encounter warnings or errors, such as:

#### **Error: Unable to Guess Serializer**:

This happens when **`drf-spectacular`** cannot automatically detect the serializer for a view (most likely an `APIView`). To resolve this, you can:

* **Add a `serializer_class`** to the view or use a **`GenericAPIView`** (which automatically determines the serializer).

For example, instead of:

```python
class MyView(APIView):
    def get(self, request):
        # Custom logic here
        return Response(data)
```

You can use:

```python
from rest_framework.generics import ListAPIView

class MyView(ListAPIView):
    serializer_class = MySerializer
    queryset = MyModel.objects.all()
```

#### **Warning: Unable to Resolve Type Hint for Function**:

This warning indicates that **type hinting** is missing in your viewset or serializer methods, such as `get_svg_map_url`. To resolve this, you can add a type hint or use **`@extend_schema_field`** to specify the field’s type in the OpenAPI schema.

For example:

```python
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

class MySerializer(serializers.ModelSerializer):
    @extend_schema_field(serializers.CharField())
    def get_svg_map_url(self, obj):
        return obj.svg_map_url
```

#### **Other Errors**:

* **Model/Serializer Matching**: Ensure that every view (e.g., `FieldEstimationListView`, `ImageDetailView`) has a corresponding **serializer class** defined and properly linked.
* **Missing Serializer Methods**: If you're dynamically constructing data in your views, explicitly define the `serializer_class` or use `@extend_schema` to describe custom responses.

---